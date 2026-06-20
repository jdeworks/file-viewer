export const plugin = {
  id: 'objc-lang',
  label: 'Objective-C',
  tags: ['objc', 'objectivec', 'm', 'mm', 'cocoa', 'ios', 'macos'],
  match(intake) {
    const name = (intake.name || intake.filename || '');
    const lower = name.toLowerCase();
    const text = intake.text || '';

    if (lower.endsWith('.mm')) return true;

    if (lower.endsWith('.m')) {
      // Must NOT match MATLAB — require at least one ObjC marker in first 3000 chars
      const head = text.slice(0, 3000);
      return head.includes('@implementation') || head.includes('#import') || head.includes('@interface');
    }

    if (lower.endsWith('.h')) {
      // Only match if it's an ObjC header (not a plain C/C++ header)
      const head = text.slice(0, 3000);
      return head.includes('@interface') || head.includes('@protocol');
    }

    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Objective-C is a superset of C that adds Smalltalk-style messaging. .m files are implementation files; .mm files are Objective-C++ (mixed ObjC and C++); .h files can declare ObjC interfaces and protocols.',
    usedFor: [
      { label: 'Apple Developer', description: 'Objective-C documentation from Apple', href: 'https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/Introduction/Introduction.html' },
      { label: 'Clang', description: 'Clang compiler with Objective-C support', href: 'https://clang.llvm.org/' },
    ],
  },
};
export default plugin;
