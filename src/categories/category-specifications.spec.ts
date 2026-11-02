import { categorySpecifications } from './category-specifications';

describe('categorySpecifications', () => {
  it('replaces legacy mobile form fields without mutating stored configuration', () => {
    const stored = [
      { key: 'camera', label: 'Camera', type: 'text' },
      { key: 'batteryPercentage', label: 'Battery Percentage', type: 'number' },
    ];
    const fields = categorySpecifications(
      'Smartphones & Mobiles',
      'smartphones',
      stored,
    );
    expect(fields.map((f) => f.key)).toEqual(
      expect.arrayContaining(['frontCamera', 'rearCamera', 'batteryCapacity']),
    );
    expect(fields.map((f) => f.key)).not.toEqual(
      expect.arrayContaining(['camera']),
    );
    expect(fields.find((f) => f.key === 'batteryHealth')?.visibleWhen).toEqual({
      field: 'brand',
      values: ['Apple'],
      caseInsensitive: true,
    });
    expect(stored[0].key).toBe('camera');
  });

  it('retains custom options and required settings', () => {
    const fields = categorySpecifications('Laptops', 'laptops', [
      {
        key: 'ram',
        label: 'Memory',
        type: 'select',
        required: true,
        options: ['192 GB'],
      },
      { key: 'assetTag', label: 'Asset Tag', type: 'text' },
    ]);
    expect(fields.find((f) => f.key === 'ram')).toMatchObject({
      required: true,
      searchable: true,
      allowCustomValue: true,
      options: expect.arrayContaining(['192 GB', '8 GB']),
    });
    expect(fields.find((f) => f.key === 'assetTag')?.type).toBe('text');
    expect(
      fields.find((f) => f.key === 'batteryHealth')?.visibleWhen,
    ).toBeUndefined();
  });

  it.each([
    'Mobiles',
    'Laptops',
    'Tablets',
    'Headphones',
    'Accessories',
    'Cameras',
    'Gaming Consoles',
  ])(
    'supplies searchable choices for %s even without stored definitions',
    (name) => {
      const fields = categorySpecifications(name, '', null);
      expect(fields.length).toBeGreaterThan(0);
      for (const field of fields) {
        expect(field.searchable).toBe(true);
        expect(field.options?.length).toBeGreaterThan(0);
      }
    },
  );

  it('handles malformed stored definitions and leaves unknown categories alone', () => {
    expect(categorySpecifications('Other', 'other', {})).toEqual([]);
    expect(
      categorySpecifications('Other', 'other', [
        { key: 'custom', label: 'Custom', type: 'text' },
      ])[0],
    ).toMatchObject({ key: 'custom', type: 'text' });
  });
});
