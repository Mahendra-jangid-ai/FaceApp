#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_REMAP_MODULE(FaceProcessor, FaceProcessorModule, NSObject)

RCT_EXTERN_METHOD(detectFace:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getEmbedding:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
