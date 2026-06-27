// Depth test for the Objective-C known view: must capture method SELECTORS with typed params +
// return type, @property type + attributes, and @interface superclass/protocols — not just names.
// Pure (analyzeObjC is DOM-free). Real fixture = the committed sample.m (implementation-only), plus
// a small inline interface/property/protocol fixture since the sample has no @interface/@property.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { analyzeObjC } from '../docs/types/text/known/objc-lang/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.m'), 'utf8');

let failed = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) failed++; };

// ---- Real sample.m: implementation + multi-part method signatures ------------------------------
{
  const { imports, interfaces, methods } = analyzeObjC(sample);
  const sel = (s) => methods.find((m) => m.selector === s);

  ok(imports.framework.includes('Foundation/Foundation.h'), 'framework import Foundation captured');
  ok(imports.project.includes('Animal.h'), 'project import Animal.h captured');
  ok(interfaces.some((i) => i.name === 'Animal' && i.kind === 'implementation'), '@implementation Animal');
  ok(interfaces.some((i) => i.name === 'AnimalStore' && i.kind === 'implementation'), '@implementation AnimalStore');

  // multi-part instance method: - (instancetype)initWithName:(NSString *)name species:(NSString *)species
  const init = sel('initWithName:species:');
  ok(!!init, 'multi-part selector initWithName:species: captured');
  ok(init && init.returns === 'instancetype' && init.class === false, 'init returns instancetype, instance method');
  ok(init && init.params.length === 2 && init.params[0].type === 'NSString *' && init.params[0].name === 'name', 'init param[0] = (NSString *)name');
  ok(init && init.params[1].type === 'NSString *' && init.params[1].name === 'species', 'init param[1] = (NSString *)species');

  // class method with generic return type: + (NSArray<Animal *> *)defaultAnimals
  const def = sel('defaultAnimals');
  ok(def && def.class === true && def.returns === 'NSArray<Animal *> *' && def.params.length === 0, 'class method defaultAnimals returns NSArray<Animal *> *');

  // single-arg method: - (BOOL)isEqualToAnimal:(Animal *)other
  const eq = sel('isEqualToAnimal:');
  ok(eq && eq.returns === 'BOOL' && eq.params[0].type === 'Animal *' && eq.params[0].name === 'other', 'isEqualToAnimal: (BOOL) with (Animal *)other');

  // owner tracking: method belongs to its enclosing @implementation
  ok(eq && eq.owner === 'Animal', 'method owner = Animal');

  // not name-only: at least one method actually carries typed params
  ok(methods.some((m) => m.params.some((p) => p.type)), 'methods carry typed params (not name-only)');
}

// ---- Inline interface/property/protocol fixture -----------------------------------------------
{
  const fixture = `
#import <Foundation/Foundation.h>
#import "Other.h"

@protocol Greeter <NSObject>
- (NSString *)greeting;
@end

@interface Foo : NSObject <NSCopying, Greeter>
@property (nonatomic, strong) NSString *title;
@property (readonly) NSInteger count;
- (NSString *)greet:(NSString *)name;
+ (instancetype)fooWithTitle:(NSString *)title;
@end

NSString *MakeGreeting(NSString *name, NSInteger times) {
    return name;
}
`;
  const { interfaces, methods, properties, functions } = analyzeObjC(fixture);

  // interface with superclass + adopted protocols
  const foo = interfaces.find((i) => i.name === 'Foo' && i.kind === 'interface');
  ok(foo && foo.super === 'NSObject', '@interface Foo : NSObject (superclass)');
  ok(foo && foo.protocols.includes('NSCopying') && foo.protocols.includes('Greeter'), 'Foo adopts <NSCopying, Greeter>');

  // protocol declaration with adopted protocol
  const greeter = interfaces.find((i) => i.name === 'Greeter' && i.kind === 'protocol');
  ok(greeter && greeter.protocols.includes('NSObject'), '@protocol Greeter <NSObject>');

  // property with type + attributes
  const title = properties.find((p) => p.name === 'title');
  ok(title && title.type === 'NSString *', 'property title type = NSString *');
  ok(title && title.attributes.includes('nonatomic') && title.attributes.includes('strong'), 'property title attributes nonatomic, strong');
  const count = properties.find((p) => p.name === 'count');
  ok(count && count.type === 'NSInteger' && count.attributes.includes('readonly'), 'property count = (readonly) NSInteger');

  // declared method signatures
  const greet = methods.find((m) => m.selector === 'greet:');
  ok(greet && greet.returns === 'NSString *' && greet.params[0].type === 'NSString *' && greet.params[0].name === 'name', 'greet: (NSString *) with (NSString *)name');
  const factory = methods.find((m) => m.selector === 'fooWithTitle:');
  ok(factory && factory.class === true && factory.returns === 'instancetype', '+ fooWithTitle: returns instancetype');

  // C function with typed params + return type
  const fn = functions.find((f) => f.name === 'MakeGreeting');
  ok(fn && fn.returns === 'NSString *' && fn.params.length === 2 && fn.params[0].type === 'NSString *' && fn.params[1].name === 'times', 'C function MakeGreeting(NSString *name, NSInteger times) -> NSString *');
}

console.log(failed ? `\n${failed} failed` : '\nall objc-lang assertions passed');
process.exit(failed ? 1 : 0);
