#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WorkoutLiveActivity, NSObject)

RCT_EXTERN_METHOD(startActivity:(NSDictionary *)activityData
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateActivity:(NSString *)activityId
                 activityData:(NSDictionary *)activityData
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopActivity:(NSString *)activityId
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopAllActivities:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)

@end