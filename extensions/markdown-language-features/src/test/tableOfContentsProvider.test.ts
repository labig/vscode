/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import 'mocha';

import { TableOfContentsProvider } from '../tableOfContentsProvider';
import { InMemoryDocument } from './inMemoryDocument';
import { createNewMarkdownEngine } from './engine';

const testFileName = vscode.Uri.parse('test.md');

suite('markdown.TableOfContentsProvider', () => {
	test('Lookup should not return anything for empty document', async () => {
		const doc = new InMemoryDocument(testFileName, '');
		const provider = new TableOfContentsProvider(createNewMarkdownEngine(), doc);

		assert.strictEqual(await provider.lookup(''), undefined);
		assert.strictEqual(await provider.lookup('foo'), undefined);
	});

	test('Lookup should not return anything for document with no headers', async () => {
		const doc = new InMemoryDocument(testFileName, 'a *b*\nc');
		const provider = new TableOfContentsProvider(createNewMarkdownEngine(), doc);

		assert.strictEqual(await provider.lookup(''), undefined);
		assert.strictEqual(await provider.lookup('foo'), undefined);
		assert.strictEqual(await provider.lookup('a'), undefined);
		assert.strictEqual(await provider.lookup('b'), undefined);
	});

	test('Lookup should return basic #header', async () => {
		const doc = new InMemoryDocument(testFileName, `# a\nx\n# c`);
		const provider = new TableOfContentsProvider(createNewMarkdownEngine(), doc);

		{
			const entry = await provider.lookup('a');
			assert.ok(entry);
			assert.strictEqual(entry!.line, 0);
		}
		{
			assert.strictEqual(await provider.lookup('x'), undefined);
		}
		{
			const entry = await provider.lookup('c');
			assert.ok(entry);
			assert.strictEqual(entry!.line, 2);
		}
	});

	test('Lookups should be case in-sensitive', async () => {
		const doc = new InMemoryDocument(testFileName, `# fOo\n`);
		const provider = new TableOfContentsProvider(createNewMarkdownEngine(), doc);

		assert.strictEqual((await provider.lookup('fOo'))!.line, 0);
		assert.strictEqual((await provider.lookup('foo'))!.line, 0);
		assert.strictEqual((await provider.lookup('FOO'))!.line, 0);
	});

	test('Lookups should ignore leading and trailing white-space, and collapse internal whitespace', async () => {
		const doc = new InMemoryDocument(testFileName, `#      f o  o    \n`);
		const provider = new TableOfContentsProvider(createNewMarkdownEngine(), doc);

		assert.strictEqual((await provider.lookup('f o  o'))!.line, 0);
		assert.strictEqual((await provider.lookup('  f o  o'))!.line, 0);
		assert.strictEqual((await provider.lookup('  f o  o  '))!.line, 0);
		assert.strictEqual((await provider.lookup('f o o'))!.line, 0);
		assert.strictEqual((await provider.lookup('f o       o'))!.line, 0);

		assert.strictEqual(await provider.lookup('f'), undefined);
		assert.strictEqual(await provider.lookup('foo'), undefined);
		assert.strictEqual(await provider.lookup('fo o'), undefined);
	});

	test('should normalize special characters #44779', async () => {
		const doc = new InMemoryDocument(testFileName, `# Indentação\n`);
		const provider = new TableOfContentsProvider(createNewMarkdownEngine(), doc);

		assert.strictEqual((await provider.lookup('indentacao'))!.line, 0);
	});

	test('should map special З, #37079', async () => {
		const doc = new InMemoryDocument(testFileName, `### Заголовок Header 3`);
		const provider = new TableOfContentsProvider(createNewMarkdownEngine(), doc);

		assert.strictEqual((await provider.lookup('Заголовок-header-3'))!.line, 0);
		assert.strictEqual((await provider.lookup('3аголовок-header-3'))!.line, 0);
	});
});
