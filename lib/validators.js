const sax = require('sax');

/**
 * Валидация BSL на дублирующие имена функций и процедур.
 * @param {string} text
 * @returns {{ message: string, start: number, end: number, relatedStart?: number, relatedEnd?: number }[]}
 */
function validateBslText(text) {
	if (typeof text !== 'string') return [];
	const diagnostics = [];
	const nameToOffsets = new Map();
	const declRegex = /(Процедура|Функция|Procedure|Function)\s+([A-Za-zA-Яа-я_][\wA-Яа-я_]*)\s*\(/g;
	for (let match; (match = declRegex.exec(text));) {
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
					name,
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
 * Валидация файла Form.xml на дублирующие атрибуты id и name.
 * @param {string} text
 * @returns {{ message: string, start: number, end: number, relatedStart?: number, relatedEnd?: number }[]}
 */
function validateFormXmlText(text) {
	const diagnostics = [];
	if (typeof text !== 'string') return diagnostics;

	const parser = sax.parser(true, {
		lowercase: false,
		trim: false,
		normalize: false
	});

	const stack = [];
	const stackIgnore = [
		'commands.command.use.xr:value'
	];

	const scope = new Set([
		'events',
		'commands', 
		'childitems', 
		'childitems.events', 
		'attributes', 
		'attributes.columns', 
		'attributes.columns.additionalcolumns'
	]);
	const scopeAttr = ['id', 'name'];
	const stackScope = [];
	const maps = new Map();

	parser.onopentag = (node) => {

		const nodeName = node.name.toLowerCase();
		stack.push(nodeName);

		if (ignoreStack(stack, stackIgnore)) return;

		let pathScope = stackScope.join('.');

		if (scope.has([pathScope, nodeName].filter(Boolean).join('.'))) {
			stackScope.push(nodeName);
			pathScope = stackScope.join('.');
		}

		if (!pathScope || !Object.keys(node.attributes).length) return;

		let map = maps.get(pathScope);

		if (!maps.has(pathScope)) {
			map = Object.fromEntries(scopeAttr.map(k => [k, new Map()]));
		}

		const start = parser.startTagPosition;
		const end = parser.position;

		scopeAttr.forEach(attr => {
			
			let value = node.attributes[attr.toUpperCase()] ?? node.attributes[attr.toLowerCase()];

			if (value !== undefined) {
				value = value ? String(value) : '';
				let message = '';
				let double = undefined;

				if (!value) {
					message = `Значение атрибута "${attr}" в блоке <${node.name}> должно быть заполнено`;
				}
				else if (attr === 'id' && !/^-?\d+$/.test(value)) {
					message = `Значение атрибута "${attr}" в блоке <${node.name}> должно содержать только цифры`;
				}
				else if (map[attr].has(value)) {
					double = map[attr].get(value);
					message = `Дублирующее значение "${attr}" в блоке <${node.name}>: "${value}"`;
				}
				else {
					map[attr].set(value, { start, end });
				}

				if (message) {
					diagnostics.push({ 
						message, 
						start, 
						end,
						name: node.name,
						value,
						attr,
						relatedStart: double ? double['start'] : undefined,
						relatedEnd: double ? double['end'] : undefined
					});
				}
			}
		});
		maps.set(pathScope, map);
	};

	parser.onclosetag = (name) => {

		const nodeName = name.toLowerCase();

		if (stack.length && stack[stack.length - 1] === nodeName) {
			stack.pop();
		}

		if ((stack.length === 1 && stackScope.length === 1 && stackScope[stackScope.length - 1] === nodeName)
			|| (stackScope.length > 1 && stackScope[stackScope.length - 1] === nodeName)) {
			maps.delete(stackScope.join('.'));
			stackScope.pop();
		}
	};

	parser.onerror = (err) => {
		parser.resume();
	};

	parser.write(text).close();

	return diagnostics;
}

function ignoreStack(stack, stackIgnore) {

	const strStack = stack.join('.');

	for (const el of stackIgnore) {
		if (strStack.endsWith(el)) return true;
	}

	return false;
}

module.exports = {
	validateBslText,
	validateFormXmlText
}; 