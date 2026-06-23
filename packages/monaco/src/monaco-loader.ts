import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

loader.config({ monaco });

export type WorkbenchMonaco = typeof monaco;

export { Editor, loader, monaco };
