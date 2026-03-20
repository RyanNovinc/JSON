import ActivityKit
import Foundation
import React

@objc(WorkoutLiveActivity)
class WorkoutLiveActivity: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func startActivity(_ activityData: [String: Any], 
                    resolve: @escaping RCTPromiseResolveBlock, 
                    reject: @escaping RCTPromiseRejectBlock) {
    
    guard #available(iOS 16.1, *) else {
      reject("UNSUPPORTED", "Live Activities require iOS 16.1 or later", nil)
      return
    }
    
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      reject("NOT_AUTHORIZED", "Live Activities are not authorized", nil)
      return
    }
    
    do {
      let endTime = activityData["endTime"] as? Double ?? 0
      let remainingSeconds = activityData["remainingSeconds"] as? Int ?? 0
      let exerciseName = activityData["exerciseName"] as? String ?? "Exercise"
      let nextExercise = activityData["nextExercise"] as? String
      let setInfo = activityData["setInfo"] as? String
      let weightReps = activityData["weightReps"] as? String
      let iconName = activityData["iconName"] as? String
      let themeColor = activityData["themeColor"] as? String ?? "#007AFF"
      
      let attributes = WorkoutLiveActivityAttributes(
        endTime: endTime,
        exerciseName: exerciseName,
        nextExercise: nextExercise,
        setInfo: setInfo,
        weightReps: weightReps,
        iconName: iconName,
        themeColor: themeColor
      )
      
      let contentState = WorkoutLiveActivityAttributes.ContentState(
        remainingSeconds: remainingSeconds,
        exerciseName: exerciseName,
        nextExercise: nextExercise,
        setInfo: setInfo,
        weightReps: weightReps,
        iconName: iconName,
        themeColor: themeColor
      )
      
      let activityContent = ActivityContent(state: contentState, staleDate: nil)
      let activity = try Activity.request(attributes: attributes, content: activityContent)
      
      resolve(activity.id)
    } catch {
      reject("START_FAILED", "Failed to start Live Activity: \(error.localizedDescription)", error)
    }
  }
  
  @objc
  func updateActivity(_ activityId: String, 
                     activityData: [String: Any],
                     resolve: @escaping RCTPromiseResolveBlock, 
                     reject: @escaping RCTPromiseRejectBlock) {
    
    guard #available(iOS 16.1, *) else {
      reject("UNSUPPORTED", "Live Activities require iOS 16.1 or later", nil)
      return
    }
    
    Task {
      for activity in Activity<WorkoutLiveActivityAttributes>.activities {
        if activity.id == activityId {
          let remainingSeconds = activityData["remainingSeconds"] as? Int ?? 0
          let exerciseName = activityData["exerciseName"] as? String ?? "Exercise"
          let nextExercise = activityData["nextExercise"] as? String
          let setInfo = activityData["setInfo"] as? String
          let weightReps = activityData["weightReps"] as? String
          let iconName = activityData["iconName"] as? String
          let themeColor = activityData["themeColor"] as? String ?? "#007AFF"
          
          let contentState = WorkoutLiveActivityAttributes.ContentState(
            remainingSeconds: remainingSeconds,
            exerciseName: exerciseName,
            nextExercise: nextExercise,
            setInfo: setInfo,
            weightReps: weightReps,
            iconName: iconName,
            themeColor: themeColor
          )
          
          let activityContent = ActivityContent(state: contentState, staleDate: nil)
          
          do {
            await activity.update(activityContent)
            resolve(true)
          } catch {
            reject("UPDATE_FAILED", "Failed to update Live Activity: \(error.localizedDescription)", error)
          }
          return
        }
      }
      reject("NOT_FOUND", "Live Activity with ID \(activityId) not found", nil)
    }
  }
  
  @objc
  func stopActivity(_ activityId: String, 
                   resolve: @escaping RCTPromiseResolveBlock, 
                   reject: @escaping RCTPromiseRejectBlock) {
    
    guard #available(iOS 16.1, *) else {
      reject("UNSUPPORTED", "Live Activities require iOS 16.1 or later", nil)
      return
    }
    
    Task {
      for activity in Activity<WorkoutLiveActivityAttributes>.activities {
        if activity.id == activityId {
          do {
            await activity.end(nil, dismissalPolicy: .immediate)
            resolve(true)
          } catch {
            reject("STOP_FAILED", "Failed to stop Live Activity: \(error.localizedDescription)", error)
          }
          return
        }
      }
      reject("NOT_FOUND", "Live Activity with ID \(activityId) not found", nil)
    }
  }
  
  @objc
  func stopAllActivities(_ resolve: @escaping RCTPromiseResolveBlock, 
                        reject: @escaping RCTPromiseRejectBlock) {
    
    guard #available(iOS 16.1, *) else {
      reject("UNSUPPORTED", "Live Activities require iOS 16.1 or later", nil)
      return
    }
    
    Task {
      for activity in Activity<WorkoutLiveActivityAttributes>.activities {
        do {
          await activity.end(nil, dismissalPolicy: .immediate)
        } catch {
          print("Failed to stop activity \(activity.id): \(error)")
        }
      }
      resolve(true)
    }
  }
}