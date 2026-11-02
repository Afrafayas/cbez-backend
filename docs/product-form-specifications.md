# Product form specification metadata

Category list/detail responses expose `specConfig`; `GET /categories/:id/specifications`
exposes the same definitions as `data.specifications`. Known electronics categories
receive suggested choices at response time, including already-created categories.
No seed command, database migration, or product rewrite is needed.

Consumers should render `type: select` fields with a searchable combobox when
`searchable` is true. `allowCustomValue` permits values outside the suggestions,
so older listings and unusual hardware remain editable. Preserve existing values
when loading edit forms, including values absent from the suggestions.

For mobile categories use `frontCamera`, `rearCamera`, and `batteryCapacity`
(mAh). `batteryHealth` remains a separate percentage and has
`visibleWhen: { field: 'brand', values: ['Apple'], caseInsensitive: true }`.
Resolve this against the selected brand name (not its database ID). Visibility
is a form rule, not a new server rejection rule. Old `camera` and
`batteryPercentage` definitions are omitted from mobile form metadata; existing
product values are retained and must not be interpreted as mAh or split into
front/rear specifications automatically.

The admin and seller AddEditProductModal components currently hardcode their
inputs. They must consume this metadata (or implement matching controls) for
search, camera separation, battery capacity, and conditional visibility to appear
in their create/edit screens. This backend change does not modify those apps.
Free-form names, descriptions, identifiers, pricing, stock, and uploads retain
their existing behavior. Suggestions are not enforced as allowed-value lists.
