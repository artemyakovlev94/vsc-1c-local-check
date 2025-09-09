const { expect } = require('chai');
const { validateFormXmlText } = require('../lib/validators');

describe('validateFormXmlText', () => {
	it('should return empty when ids are unique and digits-only', () => {
		const text = `
<Form>
	<Item id="1" />
	<Item id="2" />
</Form>`;
		const diags = validateFormXmlText(text);
		expect(diags).to.have.length(0);
	});

	it('should flag empty id value', () => {
		const text = `<Item id="" />`;
		const diags = validateFormXmlText(text);
		expect(diags).to.have.length(1);
		expect(diags[0].message).to.match(/не может быть пустым/);
	});

	it('should flag non-digit id value', () => {
		const text = `<Item id="12a" />`;
		const diags = validateFormXmlText(text);
		expect(diags).to.have.length(1);
		expect(diags[0].message).to.match(/только цифры/);
	});

	it('should flag duplicate ids (beyond first)', () => {
		const text = `
<Form>
	<Item id='10' />
	<Group>
		<Item id='10' />
	</Group>
</Form>`;
		const diags = validateFormXmlText(text);
		expect(diags).to.have.length(1);
		expect(diags[0].message).to.match(/Дублирующее значение id/);
	});
}); 