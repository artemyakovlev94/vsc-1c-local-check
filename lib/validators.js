// Reusable validators for plain text. No VS Code API deps.

/**
 * Validate BSL text for duplicate procedure/function names.
 * Returns diagnostics for all duplicate occurrences beyond the first, with reference to the first.
 * @param {string} text
 * @returns {{ message: string, start: number, end: number, relatedStart?: number, relatedEnd?: number }[]}
 */
function validateBslText(text) {
	if (typeof text !== 'string') return [];
	const diagnostics = [];
	const nameToOffsets = new Map();
	const declRegex = /(Процедура|Функция|Procedure|Function)\s+([A-Za-zA-Яа-я_][\wA-Яа-я_]*)\s*\(/g;
	for (let match; (match = declRegex.exec(text)); ) {
		const full = match[0];
		const name = match[2];
		const startInFull = full.indexOf(name);
		const nameStartOffset = match.index + (startInFull >= 0 ? startInFull : 0);
		const nameEndOffset = nameStartOffset + name.length;
		const arr = nameToOffsets.get(name) || [];
		arr.push([nameStartOffset, nameEndOffset]);
		nameToOffsets.set(name, arr);
	}
	for (const [name, ranges] of nameToOffsets) {
		if (ranges.length > 1) {
			const first = ranges[0];
			for (let i = 1; i < ranges.length; i++) {
				diagnostics.push({
					message: `Дублирующее имя процедуры/функции: "${name}"`,
					start: ranges[i][0],
					end: ranges[i][1],
					relatedStart: first[0],
					relatedEnd: first[1]
				});
			}
		}
	}
	return diagnostics;
}

/**
 * Validate Form.xml text for id attributes with scoped uniqueness.
 * - id must be non-empty, digits-only (optional leading '-') [global rule]
 * - id must be unique only within <ChildItems>...</ChildItems>, <Attributes>...</Attributes>, and <Columns>...</Columns>
 * Returns diagnostics for duplicates including reference to the first occurrence in the same scope.
 * @param {string} text
 * @returns {{ message: string, start: number, end: number, relatedStart?: number, relatedEnd?: number }[]}
 */
function validateFormXmlText(text) {
	if (typeof text !== 'string') return [];
	const diagnostics = [];

	// Scope is active only inside these container tags
	const scopeTags = new Set(['ChildItems', 'Attributes', 'Columns']);
	/** @type {{ tag: string, seen: Map<string, { count: number, firstStart: number, firstEnd: number }> }[]} */
	const scopeStack = [];

	// Stream tags
	const tagRegex = /<\s*\/\s*([A-Za-z_:][\w\-.:]*)\s*>|<\s*([A-Za-z_:][\w\-.:]*)([^>]*)>/g;

	for (let m; (m = tagRegex.exec(text)); ) {
		const closeTag = m[1];
		const openTag = m[2];
		const attrPart = m[3] || '';
		const full = m[0];
		const isSelfClosing = /\/>\s*$/.test(full);

		if (closeTag) {
			if (scopeStack.length > 0 && scopeStack[scopeStack.length - 1].tag === closeTag) {
				scopeStack.pop();
			}
			continue;
		}

		// Opening tag processing
		// Validate id format everywhere
		const idMatch = /\bid\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrPart);
		if (idMatch) {
			const value = typeof idMatch[2] === 'string' ? idMatch[2] : (idMatch[3] || '');
			const valueIndexInFull = full.indexOf(value);
			const start = m.index + (valueIndexInFull >= 0 ? valueIndexInFull : 0);
			const end = start + value.length;

			if (value.length === 0) {
				diagnostics.push({ message: 'Атрибут id не может быть пустым', start, end });
			} else if (!/^-?\d+$/.test(value)) {
				diagnostics.push({ message: 'Значение атрибута id должно содержать только цифры (может начинаться с -)', start, end });
			} else if (scopeStack.length > 0) {
				// Uniqueness applies only when inside a scoped container
				const current = scopeStack[scopeStack.length - 1];
				const entry = current.seen.get(value);
				if (entry && entry.count >= 1) {
					diagnostics.push({
						message: `Дублирующее значение id в блоке <${current.tag}>: "${value}"`,
						start,
						end,
						relatedStart: entry.firstStart,
						relatedEnd: entry.firstEnd
					});
					entry.count += 1;
				} else if (entry) {
					entry.count = 1;
					entry.firstStart = start;
					entry.firstEnd = end;
				} else {
					current.seen.set(value, { count: 1, firstStart: start, firstEnd: end });
				}
			}
		}

		// Enter scope on container open
		if (!isSelfClosing && openTag && scopeTags.has(openTag)) {
			scopeStack.push({ tag: openTag, seen: new Map() });
		}
	}

	return diagnostics;
}

module.exports = {
	validateBslText,
	validateFormXmlText
}; 