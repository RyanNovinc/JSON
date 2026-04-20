#!/usr/bin/env node

/**
 * Enhanced AWS Dashboard Backend with Feedback Management
 * Includes status tracking, priority management, and archive functionality
 */

const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const app = express();
const PORT = process.env.PORT || 3000;
const execPromise = util.promisify(exec);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Serve the enhanced dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'enhanced-dashboard.html'));
});

// API endpoint to fetch DynamoDB data
app.get('/api/dynamodb/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const region = 'ap-southeast-2';
        
        console.log(`Fetching data from table: ${tableName}`);
        
        // Use AWS CLI to scan the table
        const command = `aws dynamodb scan --table-name ${tableName} --region ${region}`;
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr) {
            console.error('AWS CLI error:', stderr);
            return res.status(500).json({ error: 'Failed to fetch data from AWS', details: stderr });
        }
        
        const result = JSON.parse(stdout);
        
        // Convert DynamoDB format to regular JSON and add management fields
        const items = result.Items ? result.Items.map(item => {
            const converted = convertDynamoDBItem(item);
            // Add default management fields if they don't exist
            if (!converted.managementStatus) converted.managementStatus = 'new';
            if (!converted.priority) converted.priority = 'medium';
            if (!converted.assignedTo) converted.assignedTo = null;
            if (!converted.isArchived) converted.isArchived = false;
            if (!converted.lastUpdated) converted.lastUpdated = converted.timestamp || new Date().toISOString();
            return converted;
        }) : [];
        
        console.log(`Fetched ${items.length} items from ${tableName}`);
        res.json(items);
        
    } catch (error) {
        console.error('Error fetching DynamoDB data:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// API endpoint to update feedback status
app.put('/api/feedback/:tableName/:id/status', async (req, res) => {
    try {
        const { tableName, id } = req.params;
        const { status, priority, assignedTo, notes } = req.body;
        const region = 'ap-southeast-2';
        
        // Valid statuses
        const validStatuses = ['new', 'in_progress', 'resolved'];
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        if (priority && !validPriorities.includes(priority)) {
            return res.status(400).json({ error: 'Invalid priority' });
        }
        
        // Build update expression
        let updateExpression = 'SET lastUpdated = :timestamp';
        let expressionAttributeValues = {
            ':timestamp': { S: new Date().toISOString() }
        };
        
        if (status) {
            updateExpression += ', managementStatus = :status';
            expressionAttributeValues[':status'] = { S: status };
        }
        
        if (priority) {
            updateExpression += ', priority = :priority';
            expressionAttributeValues[':priority'] = { S: priority };
        }
        
        if (assignedTo !== undefined) {
            updateExpression += ', assignedTo = :assignedTo';
            expressionAttributeValues[':assignedTo'] = assignedTo ? { S: assignedTo } : { NULL: true };
        }
        
        if (notes) {
            updateExpression += ', managementNotes = :notes';
            expressionAttributeValues[':notes'] = { S: notes };
        }
        
        
        const command = `aws dynamodb update-item --table-name ${tableName} --region ${region} --key '{"id":{"S":"${id}"}}' --update-expression "${updateExpression}" --expression-attribute-values '${JSON.stringify(expressionAttributeValues)}'`;
        
        // Retry mechanism for network issues
        let retries = 3;
        let lastError;
        
        for (let i = 0; i < retries; i++) {
            try {
                const { stderr } = await execPromise(command);
                
                if (stderr) {
                    lastError = stderr;
                    if (i === retries - 1) {
                        console.error('AWS CLI error after retries:', stderr);
                        return res.status(500).json({ error: 'Failed to update item', details: stderr });
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
                    continue;
                }
                break; // Success
            } catch (error) {
                lastError = error;
                if (i === retries - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
        
        console.log(`Updated feedback ${id} in ${tableName}`);
        res.json({ success: true, message: 'Feedback updated successfully' });
        
    } catch (error) {
        console.error('Error updating feedback:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// API endpoint to delete feedback (hard delete)
app.delete('/api/feedback/:tableName/:id', async (req, res) => {
    try {
        const { tableName, id } = req.params;
        const region = 'ap-southeast-2';
        
        const command = `aws dynamodb delete-item --table-name ${tableName} --region ${region} --key '{"id":{"S":"${id}"}}' --return-values ALL_OLD`;
        
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr) {
            console.error('AWS CLI error:', stderr);
            return res.status(500).json({ error: 'Failed to delete item', details: stderr });
        }
        
        const result = JSON.parse(stdout);
        if (!result.Attributes) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        console.log(`Deleted feedback ${id} from ${tableName}`);
        res.json({ success: true, message: 'Feedback deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting feedback:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// API endpoint to bulk update feedback
app.post('/api/feedback/bulk-update', async (req, res) => {
    try {
        const { items, action, data } = req.body;
        const results = [];
        
        console.log(`Starting bulk ${action} operation for ${items.length} items`);
        
        for (const item of items) {
            try {
                const { tableName, id } = item;
                
                if (action === 'delete') {
                    // Delete multiple items
                    const result = await deleteFeedbackItem(tableName, id);
                    results.push({ id, status: 'success', ...result });
                    console.log(`✅ Deleted ${id}`);
                } else if (action === 'update_status') {
                    // Update status for multiple items
                    const result = await updateFeedbackStatus(tableName, id, data);
                    results.push({ id, status: 'success', ...result });
                    console.log(`✅ Updated status for ${id}`);
                } else if (action === 'update_priority') {
                    // Update priority for multiple items
                    const result = await updateFeedbackStatus(tableName, id, { priority: data.priority });
                    results.push({ id, status: 'success', ...result });
                    console.log(`✅ Updated priority for ${id}`);
                }
            } catch (error) {
                results.push({ id: item.id, status: 'error', error: error.message });
                console.log(`❌ Failed to process ${item.id}: ${error.message}`);
            }
        }
        
        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        
        console.log(`Bulk operation completed: ${successCount} successful, ${errorCount} errors`);
        
        res.json({ 
            success: true, 
            results,
            summary: {
                total: items.length,
                successful: successCount,
                errors: errorCount
            }
        });
        
    } catch (error) {
        console.error('Error in bulk update:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// API endpoint to get feedback statistics
app.get('/api/stats/feedback', async (req, res) => {
    try {
        const tables = ['JsonAppFeedback', 'workout-app-feedback', 'user-feedback'];
        const promises = tables.map(table => fetchTableData(table));
        const results = await Promise.allSettled(promises);
        
        let allFeedback = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                allFeedback = allFeedback.concat(result.value);
            }
        });
        
        // Calculate statistics
        const stats = {
            total: allFeedback.length,
            byStatus: {
                new: allFeedback.filter(f => (f.managementStatus || 'new') === 'new').length,
                in_progress: allFeedback.filter(f => (f.managementStatus || 'new') === 'in_progress').length,
                resolved: allFeedback.filter(f => (f.managementStatus || 'new') === 'resolved').length
            },
            byPriority: {
                low: allFeedback.filter(f => (f.priority || 'medium') === 'low').length,
                medium: allFeedback.filter(f => (f.priority || 'medium') === 'medium').length,
                high: allFeedback.filter(f => (f.priority || 'medium') === 'high').length,
                critical: allFeedback.filter(f => (f.priority || 'medium') === 'critical').length
            },
            byType: {
                rating: allFeedback.filter(f => f.type === 'rating').length,
                bug: allFeedback.filter(f => f.type === 'bug').length,
                feature: allFeedback.filter(f => f.type === 'feature').length,
                testimonial: allFeedback.filter(f => f.type === 'testimonial').length
            }
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error getting feedback stats:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Helper functions
async function fetchTableData(tableName) {
    try {
        const region = 'ap-southeast-2';
        const command = `aws dynamodb scan --table-name ${tableName} --region ${region}`;
        const { stdout } = await execPromise(command);
        const result = JSON.parse(stdout);
        return result.Items ? result.Items.map(convertDynamoDBItem) : [];
    } catch (error) {
        console.warn(`Could not fetch ${tableName}:`, error.message);
        return [];
    }
}

async function updateFeedbackStatus(tableName, id, data) {
    const region = 'ap-southeast-2';
    
    let updateExpression = 'SET lastUpdated = :timestamp';
    let expressionAttributeValues = {
        ':timestamp': { S: new Date().toISOString() }
    };
    
    if (data.status) {
        updateExpression += ', managementStatus = :status';
        expressionAttributeValues[':status'] = { S: data.status };
    }
    
    if (data.priority) {
        updateExpression += ', priority = :priority';
        expressionAttributeValues[':priority'] = { S: data.priority };
    }
    
    if (data.assignedTo !== undefined) {
        updateExpression += ', assignedTo = :assignedTo';
        expressionAttributeValues[':assignedTo'] = data.assignedTo ? { S: data.assignedTo } : { NULL: true };
    }
    
    const command = `aws dynamodb update-item --table-name ${tableName} --region ${region} --key '{"id":{"S":"${id}"}}' --update-expression "${updateExpression}" --expression-attribute-values '${JSON.stringify(expressionAttributeValues)}'`;
    
    await execPromise(command);
    return { message: 'Status updated successfully' };
}

async function deleteFeedbackItem(tableName, id) {
    const region = 'ap-southeast-2';
    
    const command = `aws dynamodb delete-item --table-name ${tableName} --region ${region} --key '{"id":{"S":"${id}"}}' --return-values ALL_OLD`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
        throw new Error(`AWS CLI error: ${stderr}`);
    }
    
    const result = JSON.parse(stdout);
    if (!result.Attributes) {
        throw new Error('Item not found');
    }
    
    return { message: 'Item deleted successfully' };
}

// Helper function to convert DynamoDB item format to regular JSON
function convertDynamoDBItem(item) {
    const converted = {};
    
    for (const [key, value] of Object.entries(item)) {
        if (value.S) converted[key] = value.S;
        else if (value.N) converted[key] = Number(value.N);
        else if (value.BOOL) converted[key] = value.BOOL;
        else if (value.SS) converted[key] = value.SS;
        else if (value.NS) converted[key] = value.NS.map(Number);
        else if (value.M) converted[key] = convertDynamoDBItem(value.M);
        else if (value.L) converted[key] = value.L.map(convertDynamoDBItem);
        else if (value.NULL) converted[key] = null;
        else converted[key] = value;
    }
    
    return converted;
}

// API endpoint to test AWS connection
app.get('/api/test-aws', async (req, res) => {
    try {
        const { stdout } = await execPromise('aws sts get-caller-identity');
        const identity = JSON.parse(stdout);
        
        res.json({
            connected: true,
            account: identity.Account,
            arn: identity.Arn
        });
        
    } catch (error) {
        console.error('AWS connection test failed:', error);
        res.status(500).json({
            connected: false,
            error: error.message
        });
    }
});

// API endpoint for system health check
app.get('/api/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
            aws_connection: false,
            dynamodb_access: false,
            tables_accessible: false
        },
        errors: []
    };

    try {
        // Test AWS connection
        await execPromise('aws sts get-caller-identity');
        health.checks.aws_connection = true;
    } catch (error) {
        health.checks.aws_connection = false;
        health.errors.push('AWS CLI not configured or unavailable');
    }

    try {
        // Test DynamoDB access
        await execPromise('aws dynamodb list-tables --region ap-southeast-2');
        health.checks.dynamodb_access = true;
    } catch (error) {
        health.checks.dynamodb_access = false;
        health.errors.push('Cannot access DynamoDB');
    }

    try {
        // Test specific tables
        const tables = ['JsonAppFeedback', 'workout-app-feedback', 'user-feedback'];
        for (const table of tables) {
            await execPromise(`aws dynamodb describe-table --table-name ${table} --region ap-southeast-2`);
        }
        health.checks.tables_accessible = true;
    } catch (error) {
        health.checks.tables_accessible = false;
        health.errors.push('One or more feedback tables inaccessible');
    }

    // Overall status
    const allHealthy = Object.values(health.checks).every(check => check === true);
    health.status = allHealthy ? 'healthy' : 'degraded';

    res.status(allHealthy ? 200 : 503).json(health);
});

// Data validation endpoint
app.get('/api/validate-data', async (req, res) => {
    try {
        const tables = ['JsonAppFeedback', 'workout-app-feedback', 'user-feedback'];
        const validation = {
            timestamp: new Date().toISOString(),
            tables: {},
            issues: [],
            summary: { total_records: 0, invalid_records: 0 }
        };

        for (const tableName of tables) {
            try {
                const data = await fetchTableData(tableName);
                const tableValidation = {
                    record_count: data.length,
                    missing_ids: 0,
                    missing_timestamps: 0,
                    invalid_types: 0
                };

                data.forEach(item => {
                    if (!item.id) tableValidation.missing_ids++;
                    if (!item.timestamp && !item.createdAt) tableValidation.missing_timestamps++;
                    if (item.type && !['rating', 'bug', 'feature', 'testimonial', 'import_negative'].includes(item.type)) {
                        tableValidation.invalid_types++;
                    }
                });

                validation.tables[tableName] = tableValidation;
                validation.summary.total_records += data.length;
                validation.summary.invalid_records += tableValidation.missing_ids + tableValidation.missing_timestamps;

                if (tableValidation.missing_ids > 0) {
                    validation.issues.push(`${tableName}: ${tableValidation.missing_ids} records missing IDs`);
                }
                if (tableValidation.missing_timestamps > 0) {
                    validation.issues.push(`${tableName}: ${tableValidation.missing_timestamps} records missing timestamps`);
                }
                if (tableValidation.invalid_types > 0) {
                    validation.issues.push(`${tableName}: ${tableValidation.invalid_types} records with invalid types`);
                }

            } catch (error) {
                validation.issues.push(`${tableName}: Failed to validate - ${error.message}`);
                validation.tables[tableName] = { error: error.message };
            }
        }

        res.json(validation);

    } catch (error) {
        console.error('Data validation error:', error);
        res.status(500).json({ error: 'Failed to validate data', details: error.message });
    }
});

// API endpoint to list all available tables
app.get('/api/tables', async (req, res) => {
    try {
        const region = 'ap-southeast-2';
        const command = `aws dynamodb list-tables --region ${region}`;
        const { stdout } = await execPromise(command);
        
        const result = JSON.parse(stdout);
        res.json(result.TableNames || []);
        
    } catch (error) {
        console.error('Error listing tables:', error);
        res.status(500).json({ error: 'Failed to list tables', details: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Enhanced AWS Dashboard Backend running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
    console.log(`🔧 Management features enabled:`);
    console.log(`   • Status tracking (New → In Progress → Resolved)`);
    console.log(`   • Priority management (Low/Medium/High/Critical)`);
    console.log(`   • Delete functionality`);
    console.log(`   • Bulk operations support`);
    console.log(`   • Assignment tracking`);
    
    // Test AWS connection on startup
    exec('aws sts get-caller-identity', (error, stdout, stderr) => {
        if (error) {
            console.log('⚠️  AWS CLI not configured or not available');
        } else {
            const identity = JSON.parse(stdout);
            console.log(`✅ Connected to AWS Account: ${identity.Account}`);
        }
    });
});

module.exports = app;