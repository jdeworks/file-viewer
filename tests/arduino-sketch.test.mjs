// Unit test for the Arduino-sketch enhanced view's parser. Asserts it captures function SIGNATURES
// (return type + typed params), constants/globals WITH type and value, and hardware objects — the
// depth the enhance pass gave other language views (e.g. Solidity) but Arduino had missed. Runs in
// plain node (parseArduino is DOM-free). Uses the committed sample as the fixture.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseArduino } from '../docs/types/text/known/arduino-sketch/renderer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const sample = readFileSync(resolve(HERE, '../docs/examples/sample.ino'), 'utf8');
const { includes, functions, defines, constVars, globalVars, objects } = parseArduino(sample);

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? '✓ ' : '✗ ') + msg); if (!cond) failed++; };
const fn = (name) => functions.find((f) => f.name === name);

// includes + defines
ok(includes.includes('DHT.h') && includes.includes('Wire.h'), 'includes captured');
ok(defines.some((d) => d.name === 'DHT_PIN' && d.value === '2'), '#define name + value');

// functions: return type + typed params, setup/loop excluded
const dr = fn('displayReading');
ok(dr && dr.returnType === 'void', 'displayReading return type = void');
ok(dr && dr.params.length === 2 && dr.params[0].type === 'float' && dr.params[0].name === 'temp'
   && dr.params[1].type === 'float' && dr.params[1].name === 'hum', 'displayReading params have types + names');
ok(fn('blinkLed') && fn('blinkLed').params[0].type === 'int' && fn('blinkLed').params[0].name === 'times', 'blinkLed(int times)');
ok(fn('celsiusToFahrenheit') && fn('celsiusToFahrenheit').params[0].type === 'float', 'celsiusToFahrenheit(float c)');
ok(!fn('setup') && !fn('loop'), 'setup/loop not listed as plain functions');
ok(functions.length === 4, 'exactly the 4 helper functions (got ' + functions.map((f) => f.name).join(',') + ')');

// const + global vars carry type and value
ok(constVars.some((c) => c.type === 'int' && c.name === 'lcdAddr' && c.value === '0x27'), 'const int lcdAddr = 0x27');
ok(globalVars.some((g) => g.type === 'float' && g.name === 'lastTemp' && g.value === '0.0'), 'global float lastTemp = 0.0');
ok(globalVars.some((g) => g.name === 'alertActive' && g.type === 'bool'), 'global bool alertActive');

// locals inside loop() must NOT leak into globals
ok(!globalVars.some((g) => g.name === 'temperature' || g.name === 'humidity'), 'locals not counted as globals');

// hardware objects/peripherals
ok(objects.some((o) => o.className === 'DHT' && o.name === 'dht' && o.args === 'DHT_PIN, DHT11'), 'DHT dht(DHT_PIN, DHT11) object');
ok(objects.some((o) => o.className === 'LiquidCrystal_I2C' && o.name === 'lcd'), 'LiquidCrystal_I2C lcd object');

console.log(failed ? `\n${failed} assertion(s) failed` : '\nall arduino-sketch parser assertions passed');
process.exit(failed ? 1 : 0);
