# VSC 1C Local check

Расширение VSC 1C Helper для дополнительной проверки файлов 1С.

## Проверки

- Проверка файлов `.bsl` на дубли имён процедур и функций
  - В одном файле не может быть две и более процедур/функций с одинаковым именем
- Проверка файлов `Form.xml` на корректность и уникальность атрибутов `id` и `name`
  - `id` обязателен и не может быть пустым
  - `id` должен содержать только цифры
  - Значения `id` должны быть уникальны в пределах тегов: `events`, `commands`, `childitems`, `childitems.events`, `attributes`, `attributes.columns` и `attributes.columns.additionalcolumns`
- Проверка файлов `Form.xml` на корректность и уникальность атрибутов `name`
  - `name` обязателен и не может быть пустым
  - Значения `name` должны быть уникальны в пределах тегов: `events`, `commands`, `childitems`, `childitems.events`, `attributes`, `attributes.columns` и `attributes.columns.additionalcolumns`

## Release Notes

Detailed release notes are available [here](https://github.com/artemyakovlev94/vsc-1c-local-check/releases).
