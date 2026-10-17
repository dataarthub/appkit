import { expect, test } from 'vitest';
import * as coreAction from "@alneas/appkit-core/ai";
import * as coreProposal from "@alneas/appkit-core/ai";
import * as coreUI from "@alneas/appkit-core/ai";
import * as coreChat from "@alneas/appkit-core/ai";
import * as action from './action';
import * as proposal from './proposal';
import * as ui from './generative-ui';
import * as chat from './ai-chat';
test('React entry points expose the complete canonical runtime contracts', () => {
  for (const [core, react] of [[coreAction, action], [coreProposal, proposal], [coreUI, ui], [coreChat, chat]]) {
    for (const [name, value] of Object.entries(core)) expect((react as Record<string, unknown>)[name]).toBe(value);
  }
});
