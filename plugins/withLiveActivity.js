const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withLiveActivity(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const bundleId = IOSConfig.BundleIdentifier.getBundleIdentifier(config);
    
    // Add the Live Activity widget extension target
    const targetName = 'LiveActivity';
    const targetUuid = xcodeProject.generateUuid();
    const targetProductUuid = xcodeProject.generateUuid();
    const targetDependencyUuid = xcodeProject.generateUuid();
    const targetProxyUuid = xcodeProject.generateUuid();
    
    // Add target to project
    xcodeProject.addTarget(targetName, 'app_extension', targetName, bundleId + '.LiveActivity');
    
    // Find the newly created target
    const target = xcodeProject.getFirstTarget().uuid;
    
    // Add Swift files to the target
    const liveActivityFiles = [
      'LiveActivity/LiveActivity.swift',
      'LiveActivity/LiveActivityWidget.swift', 
      'LiveActivity/LiveActivityView.swift'
    ];
    
    liveActivityFiles.forEach(filePath => {
      const fileRef = xcodeProject.addFile(filePath);
      if (fileRef) {
        xcodeProject.addBuildFile(fileRef, target);
      }
    });
    
    // Add Info.plist
    const infoPlistRef = xcodeProject.addFile('LiveActivity/Info.plist');
    if (infoPlistRef) {
      xcodeProject.addBuildFile(infoPlistRef, target);
    }
    
    // Configure build settings
    const targetObject = xcodeProject.getTarget(targetName);
    if (targetObject) {
      const configurations = targetObject.buildConfigurationList;
      // Add WidgetKit framework
      xcodeProject.addFramework('WidgetKit.framework', { target: targetUuid, link: false });
      xcodeProject.addFramework('SwiftUI.framework', { target: targetUuid, link: false });
      xcodeProject.addFramework('ActivityKit.framework', { target: targetUuid, link: false });
    }
    
    return config;
  });
}

module.exports = withLiveActivity;