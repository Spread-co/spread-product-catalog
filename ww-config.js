export default {
  editor: {
    label: { en: 'Spread Product Catalog' },
    icon: 'grid',
    categories: ['content'],
  },
  properties: {
    supabaseUrl: {
      label: { en: 'Supabase URL' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    supabaseAnonKey: {
      label: { en: 'Supabase Anon Key' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    accessToken: {
      label: { en: 'Auth Token' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
      hidden: true,
    },
    accessMode: {
      label: { en: 'Access Mode' },
      type: 'TextSelect',
      options: {
        options: [
          { value: 'public', label: { en: 'Open to Public' } },
          { value: 'members_only', label: { en: 'Members Only' } },
        ],
      },
      bindable: true,
      defaultValue: 'members_only',
    },
    regionId: {
      label: { en: 'Region ID' },
      type: 'Text',
      bindable: true,
      defaultValue: '',
    },
    requireRegion: {
      label: { en: 'Require Region' },
      type: 'OnOff',
      defaultValue: true,
    },
    heading: {
      label: { en: 'Heading' },
      type: 'Text',
      bindable: true,
      defaultValue: 'Fresh from Local Farms',
    },
    pageSize: {
      label: { en: 'Products per Page' },
      type: 'Number',
      options: { min: 4, max: 60, step: 4 },
      bindable: true,
      defaultValue: 12,
    },
    showSearch: {
      label: { en: 'Show Search' },
      type: 'OnOff',
      defaultValue: true,
    },
    showCategoryFilter: {
      label: { en: 'Show Category Filter' },
      type: 'OnOff',
      defaultValue: true,
    },
    showSortControl: {
      label: { en: 'Show Sort Control' },
      type: 'OnOff',
      defaultValue: true,
    },
    showPrice: {
      label: { en: 'Show Price' },
      type: 'OnOff',
      defaultValue: true,
    },
    showAddToCart: {
      label: { en: 'Show Add to Cart' },
      type: 'OnOff',
      bindable: true,
      defaultValue: true,
    },
    addToCartLabel: {
      label: { en: 'Add to Cart Label' },
      type: 'Text',
      bindable: true,
      defaultValue: 'Add to Cart',
    },
    emptyMessage: {
      label: { en: 'Empty State Message' },
      type: 'Text',
      bindable: true,
      defaultValue: 'No products found. Try changing your search or filters.',
    },
  },
  triggerEvents: [
    {
      name: 'product:click',
      label: { en: 'On Product Click' },
      event: { productId: '', slug: '' },
    },
    {
      name: 'product:addToCart',
      label: { en: 'On Add to Cart' },
      event: { productId: '', variantId: '', name: '', price: 0, cartItemId: '' },
    },
    {
      name: 'catalog:loaded',
      label: { en: 'On Catalog Loaded' },
      event: { count: 0, hasMore: false },
    },
    {
      name: 'catalog:error',
      label: { en: 'On Error' },
      event: { message: '' },
    },
  ],
};
