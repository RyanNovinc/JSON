#!/usr/bin/env node

/**
 * AWS Dashboard Backend Server
 * Serves the HTML dashboard and provides API endpoints for fetching AWS data
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
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
});

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'feedback-dashboard.html'));
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
        
        // Convert DynamoDB format to regular JSON
        const items = result.Items ? result.Items.map(convertDynamoDBItem) : [];
        
        console.log(`Fetched ${items.length} items from ${tableName}`);
        res.json(items);
        
    } catch (error) {
        console.error('Error fetching DynamoDB data:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// API endpoint to get table statistics
app.get('/api/stats/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const region = 'ap-southeast-2';
        
        const command = `aws dynamodb describe-table --table-name ${tableName} --region ${region}`;
        const { stdout } = await execPromise(command);
        
        const result = JSON.parse(stdout);
        const itemCount = result.Table.ItemCount;
        const tableSize = result.Table.TableSizeBytes;
        
        res.json({
            itemCount,
            tableSize,
            tableName: result.Table.TableName,
            status: result.Table.TableStatus
        });
        
    } catch (error) {
        console.error('Error fetching table stats:', error);
        res.status(500).json({ error: 'Failed to get table statistics', details: error.message });
    }
});

// API endpoint to fetch recent items (last 24 hours)
app.get('/api/recent/:tableName', async (req, res) => {
    try {
        const { tableName } = req.params;
        const region = 'ap-southeast-2';
        
        // Get timestamp for 24 hours ago
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const timestampFilter = yesterday.toISOString();
        
        // Use AWS CLI with filter expression
        const command = `aws dynamodb scan --table-name ${tableName} --region ${region} --filter-expression "#ts > :yesterday" --expression-attribute-names '{"#ts":"timestamp"}' --expression-attribute-values '{"S":"${timestampFilter}"}}'`;
        
        const { stdout } = await execPromise(command);
        const result = JSON.parse(stdout);
        const items = result.Items ? result.Items.map(convertDynamoDBItem) : [];
        
        res.json(items);
        
    } catch (error) {
        console.error('Error fetching recent data:', error);
        res.status(500).json({ error: 'Failed to fetch recent data', details: error.message });
    }
});

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
        else converted[key] = value;
    }
    
    return converted;
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AWS Dashboard Backend running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
    console.log(`🔧 API endpoints:`);
    console.log(`   GET /api/tables - List all DynamoDB tables`);
    console.log(`   GET /api/dynamodb/:tableName - Get all data from a table`);
    console.log(`   GET /api/recent/:tableName - Get recent data (last 24h)`);
    console.log(`   GET /api/stats/:tableName - Get table statistics`);
    console.log(`   GET /api/test-aws - Test AWS connection`);
    
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