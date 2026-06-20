//
//  sample.m
//  SampleApp — Objective-C implementation example
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import "Animal.h"
#import "AnimalStore.h"

@implementation Animal

@synthesize name = _name;
@synthesize species = _species;
@dynamic identifier;

- (instancetype)initWithName:(NSString *)name species:(NSString *)species {
    self = [super init];
    if (self) {
        _name = [name copy];
        _species = [species copy];
    }
    return self;
}

- (NSString *)description {
    return [NSString stringWithFormat:@"Animal: %@ (%@)", _name, _species];
}

- (BOOL)isEqualToAnimal:(Animal *)other {
    if (!other) return NO;
    return [_name isEqualToString:other.name] &&
           [_species isEqualToString:other.species];
}

+ (Animal *)unknownAnimal {
    return [[Animal alloc] initWithName:@"Unknown" species:@"Unknown"];
}

+ (NSArray<Animal *> *)defaultAnimals {
    return @[
        [[Animal alloc] initWithName:@"Eagle" species:@"Haliaeetus leucocephalus"],
        [[Animal alloc] initWithName:@"Tiger" species:@"Panthera tigris"],
        [[Animal alloc] initWithName:@"Dolphin" species:@"Tursiops truncatus"],
    ];
}

@end

@implementation AnimalStore {
    NSMutableArray<Animal *> *_animals;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _animals = [NSMutableArray array];
    }
    return self;
}

- (void)addAnimal:(Animal *)animal {
    if (animal) {
        [_animals addObject:animal];
    }
}

- (void)removeAnimal:(Animal *)animal {
    [_animals removeObject:animal];
}

- (NSArray<Animal *> *)animalsForSpecies:(NSString *)species {
    return [_animals filteredArrayUsingPredicate:
        [NSPredicate predicateWithFormat:@"species == %@", species]];
}

- (NSUInteger)count {
    return _animals.count;
}

@end
