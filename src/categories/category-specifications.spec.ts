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

  it('verifies dropdown options for RAM, Storage, Front Camera, Rear Camera, Battery Capacity', () => {
    const fields = categorySpecifications('Smartphones & Mobiles', 'smartphones', null);

    // 1. RAM dropdown
    const ram = fields.find((f) => f.key === 'ram');
    expect(ram).toMatchObject({
      key: 'ram',
      label: 'RAM',
      type: 'select',
      searchable: true,
      allowCustomValue: true,
    });
    expect(ram?.options).toEqual(
      expect.arrayContaining(['4 GB', '6 GB', '8 GB', '12 GB', '16 GB']),
    );

    // 2. Storage dropdown
    const storage = fields.find((f) => f.key === 'storage');
    expect(storage).toMatchObject({
      key: 'storage',
      label: 'Storage',
      type: 'select',
      searchable: true,
      allowCustomValue: true,
    });
    expect(storage?.options).toEqual(
      expect.arrayContaining(['64 GB', '128 GB', '256 GB', '512 GB', '1 TB']),
    );

    // 3. Rear Cam
    const rearCam = fields.find((f) => f.key === 'rearCamera');
    expect(rearCam).toMatchObject({
      key: 'rearCamera',
      label: 'Rear Camera',
      type: 'select',
      unit: 'MP',
      searchable: true,
      allowCustomValue: true,
    });
    expect(rearCam?.options).toEqual(
      expect.arrayContaining(['12 MP', '48 MP', '50 MP', '108 MP', '200 MP']),
    );

    // 4. Front Cam
    const frontCam = fields.find((f) => f.key === 'frontCamera');
    expect(frontCam).toMatchObject({
      key: 'frontCamera',
      label: 'Front Camera',
      type: 'select',
      unit: 'MP',
      searchable: true,
      allowCustomValue: true,
    });
    expect(frontCam?.options).toEqual(
      expect.arrayContaining(['8 MP', '12 MP', '16 MP', '32 MP']),
    );

    // 5. Battery Capacity
    const batteryCapacity = fields.find((f) => f.key === 'batteryCapacity');
    expect(batteryCapacity).toMatchObject({
      key: 'batteryCapacity',
      label: 'Battery Capacity',
      type: 'select',
      unit: 'mAh',
      searchable: true,
      allowCustomValue: true,
    });
    expect(batteryCapacity?.options).toEqual(
      expect.arrayContaining(['4000 mAh', '4500 mAh', '5000 mAh', '6000 mAh']),
    );

    // Old camera and batteryPercentage are omitted from mobile
    expect(fields.find((f) => f.key === 'camera')).toBeUndefined();
    expect(fields.find((f) => f.key === 'batteryPercentage')).toBeUndefined();
  });
});
