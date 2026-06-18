#import <Foundation/Foundation.h>

@interface FVPreviewController : NSObject
@property (nonatomic, copy) NSArray<NSString *> *recentFiles;
- (NSString *)statusLineForSelection:(NSString *)filename;
@end

@implementation FVPreviewController

- (instancetype)init {
  self = [super init];
  if (self) {
    _recentFiles = @[ @"welcome.md", @"sample.pdf", @"main.py" ];
  }
  return self;
}

- (NSString *)statusLineForSelection:(NSString *)filename {
  if ([self.recentFiles containsObject:filename]) {
    return [NSString stringWithFormat:@"Ready to preview %@", filename];
  }
  return @"Select a file to preview";
}

@end
