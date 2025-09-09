const { expect } = require('chai');
const { validateBslText } = require('../lib/validators');

describe('validateBslText', () => {
	it('should return empty for unique names', () => {
		const text = `
Процедура First()
КонецПроцедуры

Функция Second()
КонецФункции
`;
		const diags = validateBslText(text);
		expect(diags).to.have.length(0);
	});

	it('should flag duplicates for same procedure name', () => {
		const text = `
Процедура Foo()
КонецПроцедуры

Процедура Foo()
КонецПроцедуры
`;
		const diags = validateBslText(text);
		expect(diags).to.have.length(1);
		expect(diags[0].message).to.match(/Дублирующее имя/);
	});

	it('should flag duplicates across procedure and function', () => {
		const text = `
Процедура Bar()
КонецПроцедуры

Функция Bar()
КонецФункции
`;
		const diags = validateBslText(text);
		expect(diags).to.have.length(1);
	});

	it('should handle English keywords', () => {
		const text = `
Procedure DoWork()
EndProcedure

Function DoWork()
EndFunction
`;
		const diags = validateBslText(text);
		expect(diags).to.have.length(1);
	});
}); 