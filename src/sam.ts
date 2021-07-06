/**
 * This file is the entrypoint of browser builds.
 * The code executes when loaded in a browser.
 */
import { BrainSam } from './main'

(window as any).sam_data = (window as any).sam_data || [];
new BrainSam((window as any).sam_data);
