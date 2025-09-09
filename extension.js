// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const { validateBslText, validateFormXmlText } = require('./lib/validators');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "vsc-1c-helper" is now active!');

	const bslDiagnostics = vscode.languages.createDiagnosticCollection('vsc-1c-helper-bsl');
	const xmlDiagnostics = vscode.languages.createDiagnosticCollection('vsc-1c-helper-xml');
	context.subscriptions.push(bslDiagnostics, xmlDiagnostics);

	function validateBslDocument(document) {
		if (!document || !document.fileName) return;
		const lowerFile = document.fileName.toLowerCase();
		const isBsl = document.languageId === 'bsl' || lowerFile.endsWith('.bsl');
		if (!isBsl) {
			bslDiagnostics.delete(document.uri);
			return;
		}
		const text = document.getText();
		const simple = validateBslText(text);

		/** @type {vscode.Diagnostic[]} */
		const diagnostics = [];
		/** @type {Set<string>} */
		const firstSeenAdded = new Set();

		for (const d of simple) {
			const range = new vscode.Range(document.positionAt(d.start), document.positionAt(d.end));
			const diag = new vscode.Diagnostic(range, d.message, vscode.DiagnosticSeverity.Error);
			if (typeof d.relatedStart === 'number' && typeof d.relatedEnd === 'number') {
				const firstRange = new vscode.Range(document.positionAt(d.relatedStart), document.positionAt(d.relatedEnd));
				const relatedLoc = new vscode.Location(document.uri, firstRange);
				diag.relatedInformation = [
					new vscode.DiagnosticRelatedInformation(relatedLoc, 'Первое вхождение этого имени')
				];
				const firstKey = `${d.relatedStart}:${d.relatedEnd}`;
				if (!firstSeenAdded.has(firstKey)) {
					firstSeenAdded.add(firstKey);
					const firstDiag = new vscode.Diagnostic(firstRange, 'Первое вхождение дублирующего имени', vscode.DiagnosticSeverity.Error);
					diagnostics.push(firstDiag);
				}
			}
			diagnostics.push(diag);
		}

		bslDiagnostics.set(document.uri, diagnostics);
	}

	function validateFormXmlDocument(document) {
		if (!document || !document.fileName) return;
		const fileNameLower = document.fileName.toLowerCase();
		if (!fileNameLower.endsWith('form.xml')) {
			xmlDiagnostics.delete(document.uri);
			return;
		}
		const text = document.getText();
		const simple = validateFormXmlText(text);

		/** @type {vscode.Diagnostic[]} */
		const diagnostics = [];
		/** @type {Set<string>} */
		const firstSeenAdded = new Set();

		for (const d of simple) {
			const range = new vscode.Range(document.positionAt(d.start), document.positionAt(d.end));
			const diag = new vscode.Diagnostic(range, d.message, vscode.DiagnosticSeverity.Error);
			// Attach related info to point to the first occurrence if available
			if (typeof d.relatedStart === 'number' && typeof d.relatedEnd === 'number') {
				const firstRange = new vscode.Range(document.positionAt(d.relatedStart), document.positionAt(d.relatedEnd));
				const relatedLoc = new vscode.Location(document.uri, firstRange);
				diag.relatedInformation = [
					new vscode.DiagnosticRelatedInformation(relatedLoc, 'Первое вхождение этого id')
				];
				// Also ensure the first occurrence itself is highlighted once
				const firstKey = `${d.relatedStart}:${d.relatedEnd}`;
				if (!firstSeenAdded.has(firstKey)) {
					firstSeenAdded.add(firstKey);
					const firstDiag = new vscode.Diagnostic(firstRange, 'Первое вхождение дублирующего id', vscode.DiagnosticSeverity.Error);
					diagnostics.push(firstDiag);
				}
			}
			diagnostics.push(diag);
		}

		xmlDiagnostics.set(document.uri, diagnostics);
	}

	function validateDocument(document) {
		if (!document) return;
		const file = document.fileName.toLowerCase();
		const isBsl = document.languageId === 'bsl' || file.endsWith('.bsl');
		if (isBsl) {
			validateBslDocument(document);
		} else if (file.endsWith('form.xml')) {
			validateFormXmlDocument(document);
		} else {
			bslDiagnostics.delete(document.uri);
			xmlDiagnostics.delete(document.uri);
		}
	}

	if (vscode.window.visibleTextEditors && vscode.window.visibleTextEditors.length > 0) {
		for (const editor of vscode.window.visibleTextEditors) {
			validateDocument(editor.document);
		}
	}
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => validateDocument(doc)));
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => validateDocument(e.document)));
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) validateDocument(editor.document);
	}));
	// Clear diagnostics when a document is closed
	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc => {
		bslDiagnostics.delete(doc.uri);
		xmlDiagnostics.delete(doc.uri);
	}));
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
