import { SearchableSelect } from './SearchableSelect';
import { fieldVisible, representedFields } from '../utils/productFormOptions';
import type { SpecificationField } from '../utils/categorySpecifications';

export function AdditionalSpecifications({ fields, group, brand, values, onChange, dark = false }: {
  fields: SpecificationField[]; group: string; brand: string;
  values: Record<string, string>; onChange: (key: string, value: string) => void; dark?: boolean;
}) {
  return <>{fields.filter(field => !representedFields(group).includes(field.key) && fieldVisible(field, brand)).map(field =>
    <div key={field.key} style={{ minWidth: 0 }}>
      <label htmlFor={`extra-${field.key}`} style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: dark ? '#cbd5e1' : '#0f172a' }}>{field.label}</label>
      <SearchableSelect id={`extra-${field.key}`} aria-label={field.label} required={!!field.required}
        options={field.options || (field.type === 'boolean' ? ['Yes', 'No'] : [])}
        value={values[field.key] ?? values[field.label] ?? ''} onChange={event => onChange(field.key, event.target.value)}
        placeholder={typeof field.placeholder === 'string' ? field.placeholder : `Select or enter ${field.label.toLowerCase()}`}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #64748b', background: dark ? '#0f172a' : '#fff', color: dark ? '#e2e8f0' : '#0f172a', boxSizing: 'border-box' }} />
    </div>
  )}</>;
}
