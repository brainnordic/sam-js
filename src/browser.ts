/**
 * This file is the entrypoint of browser builds.
 * The code executes when loaded in a browser.
 */
import { foo } from './main'
import { BrainSam } from './main'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).foo = foo  // instead of casting window to any, you can extend the Window interface: https://stackoverflow.com/a/43513740/5433572

const g = new BrainSam('aaaa bbb');
g.greet();

(window as any).BrainSam = BrainSam;

console.log('Method "foo" was added to the window object. You can try it yourself by just entering "await foo()"')
