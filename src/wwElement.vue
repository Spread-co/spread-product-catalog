<template>
  <div class="spread-catalog">
    <!-- Header -->
    <div class="spread-catalog__header" v-if="displayHeading">
      <h2 class="spread-catalog__title">{{ displayHeading }}</h2>
    </div>

    <!-- Toolbar (search + category filter) -->
    <div class="spread-catalog__toolbar" v-if="showSearchComputed || showCategoryFilterComputed">
      <!-- Search -->
      <div class="spread-catalog__search-wrap" v-if="showSearchComputed">
        <svg class="spread-catalog__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="#6B7280" stroke-width="2"/>
          <path d="M16 16l5 5" stroke="#6B7280" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input
          class="spread-catalog__search-input"
          type="text"
          placeholder="Search products…"
          :value="searchQuery"
          @input="onSearchInput"
        />
        <button
          class="spread-catalog__search-clear"
          v-if="searchQuery"
          @click="clearSearch"
          aria-label="Clear search"
        >
          &times;
        </button>
      </div>

      <!-- Category filter -->
      <div class="spread-catalog__filter-wrap" v-if="showCategoryFilterComputed">
        <select class="spread-catalog__category-select" v-model="selectedCategoryId" @change="onCategoryChange">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
    </div>

    <!-- Gate overlay (members_only + not authenticated) -->
    <div class="spread-catalog__gate" v-if="isGated">
      <div class="spread-catalog__gate-card">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="#4B162D" stroke-width="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="#4B162D" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h3 class="spread-catalog__gate-title">Members Only</h3>
        <p class="spread-catalog__gate-text">Sign in or become a member to browse our full product catalog.</p>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div class="spread-catalog__grid" v-else-if="loading && !products.length">
      <div class="spread-catalog__skeleton-card" v-for="n in skeletonCount" :key="'sk-' + n">
        <div class="spread-catalog__skeleton-image"></div>
        <div class="spread-catalog__skeleton-body">
          <div class="spread-catalog__skeleton-bar spread-catalog__skeleton-bar--lg"></div>
          <div class="spread-catalog__skeleton-bar spread-catalog__skeleton-bar--sm"></div>
          <div class="spread-catalog__skeleton-bar spread-catalog__skeleton-bar--md"></div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div class="spread-catalog__error" v-else-if="error">
      <div class="spread-catalog__error-card">
        <span class="spread-catalog__error-icon">!</span>
        <p class="spread-catalog__error-message">{{ error }}</p>
        <button class="spread-catalog__btn spread-catalog__btn--secondary" @click="fetchProducts(true)">Try Again</button>
      </div>
    </div>

    <!-- Empty state -->
    <div class="spread-catalog__empty" v-else-if="!products.length">
      <p class="spread-catalog__empty-text">{{ displayEmptyMessage }}</p>
    </div>

    <!-- Product grid -->
    <template v-else>
      <div class="spread-catalog__grid">
        <div
          v-for="product in products"
          :key="product.id"
          class="spread-catalog__card"
          :class="{ 'spread-catalog__card--oos': !product.in_stock }"
          @click="handleProductClick(product)"
        >
          <!-- Image -->
          <div class="spread-catalog__card-image-wrap">
            <img
              v-if="product.image_url"
              :src="product.image_url"
              :alt="product.name"
              class="spread-catalog__card-image"
              loading="lazy"
            />
            <div v-else class="spread-catalog__card-image-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="4" stroke="#CBD5E1" stroke-width="1.5"/>
                <circle cx="8.5" cy="8.5" r="2" stroke="#CBD5E1" stroke-width="1.5"/>
                <path d="M2 16l5-5 4 4 3-3 8 8" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>

            <!-- Category badge -->
            <span class="spread-catalog__card-badge" v-if="product.category_name">
              {{ product.category_name }}
            </span>

            <!-- Out of stock -->
            <div class="spread-catalog__card-oos" v-if="!product.in_stock">
              <span class="spread-catalog__card-oos-label">Out of Stock</span>
            </div>
          </div>

          <!-- Body -->
          <div class="spread-catalog__card-body">
            <h3 class="spread-catalog__card-name">{{ product.name }}</h3>
            <p class="spread-catalog__card-desc" v-if="product.description">
              {{ truncate(product.description, 60) }}
            </p>

            <!-- Price -->
            <div class="spread-catalog__card-price-row" v-if="showPriceComputed">
              <span class="spread-catalog__card-price">
                ${{ formatPrice(product.display_price ?? product.member_price ?? product.default_price) }}
              </span>
              <span
                class="spread-catalog__card-member-hint"
                v-if="product.is_member_price === false && product.member_price"
              >
                ${{ formatPrice(product.member_price) }} for members
              </span>
            </div>

            <!-- Add to cart -->
            <button
              v-if="showAddToCartComputed && product.in_stock"
              class="spread-catalog__card-cta"
              :disabled="addingProductId === product.id"
              @click.stop="handleAddToCart(product)"
            >
              <span v-if="addingProductId === product.id" class="spread-catalog__spinner"></span>
              <span v-else>{{ displayAddToCartLabel }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div class="spread-catalog__load-more" v-if="hasMore">
        <button
          class="spread-catalog__btn spread-catalog__btn--secondary"
          :disabled="loading"
          @click="loadMore"
        >
          <span v-if="loading" class="spread-catalog__spinner"></span>
          <span v-else>Load More</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';

/* ------------------------------------------------------------------ */
/*  Inline Supabase client (self-contained — no shared lib imports)   */
/* ------------------------------------------------------------------ */
function createSpreadClient({ supabaseUrl, supabaseAnonKey, accessToken = null }) {
  const headers = { 'Content-Type': 'application/json', apikey: supabaseAnonKey };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  return {
    async rpc(fn, params = {}) {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw Object.assign(new Error(e.message || res.statusText), { status: res.status, code: e.code });
      }
      return res.json();
    },
    async from(table, { select = '*', filters = {}, order, limit, offset } = {}) {
      const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
      url.searchParams.set('select', select);
      for (const [col, val] of Object.entries(filters)) {
        url.searchParams.set(col, val);
      }
      if (order) url.searchParams.set('order', order);
      if (limit) url.searchParams.set('limit', String(limit));
      if (offset) url.searchParams.set('offset', String(offset));
      const fetchHeaders = { ...headers };
      delete fetchHeaders['Content-Type'];
      const res = await fetch(url.toString(), { method: 'GET', headers: fetchHeaders });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw Object.assign(new Error(e.message || res.statusText), { status: res.status, code: e.code });
      }
      return res.json();
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Editor mock data                                                  */
/* ------------------------------------------------------------------ */
const EDITOR_MOCK_PRODUCTS = [
  { id: '1', name: 'Organic Roma Tomatoes', slug: 'organic-roma-tomatoes', description: 'Vine-ripened, locally grown organic Roma tomatoes.', image_url: '', category_name: 'Vegetables', category_id: 'c1', default_price: 650, member_price: 650, display_price: 650, is_member_price: true, currency: 'aud', default_variant_id: 'v1', in_stock: true },
  { id: '2', name: 'Free-Range Eggs (Dozen)', slug: 'free-range-eggs-dozen', description: 'Pasture-raised free-range eggs from local farms.', image_url: '', category_name: 'Dairy & Eggs', category_id: 'c2', default_price: 850, member_price: 850, display_price: 850, is_member_price: true, currency: 'aud', default_variant_id: 'v2', in_stock: true },
  { id: '3', name: 'Sourdough Loaf', slug: 'sourdough-loaf', description: 'Artisan sourdough bread baked fresh daily.', image_url: '', category_name: 'Bakery', category_id: 'c3', default_price: 1200, member_price: 1200, display_price: 1200, is_member_price: true, currency: 'aud', default_variant_id: 'v3', in_stock: true },
  { id: '4', name: 'Hass Avocados (3 pack)', slug: 'hass-avocados-3-pack', description: 'Perfectly ripe Hass avocados.', image_url: '', category_name: 'Fruit', category_id: 'c4', default_price: 700, member_price: 700, display_price: 700, is_member_price: true, currency: 'aud', default_variant_id: 'v4', in_stock: true },
  { id: '5', name: 'Raw Honey (500g)', slug: 'raw-honey-500g', description: 'Unprocessed raw honey from regional beekeepers.', image_url: '', category_name: 'Pantry', category_id: 'c5', default_price: 1450, member_price: 1450, display_price: 1450, is_member_price: true, currency: 'aud', default_variant_id: 'v5', in_stock: true },
  { id: '6', name: 'Baby Spinach (200g)', slug: 'baby-spinach-200g', description: 'Tender baby spinach leaves, triple-washed.', image_url: '', category_name: 'Vegetables', category_id: 'c1', default_price: 450, member_price: 450, display_price: 450, is_member_price: true, currency: 'aud', default_variant_id: 'v6', in_stock: false },
];
const EDITOR_MOCK_CATEGORIES = [
  { id: 'c1', name: 'Vegetables' },
  { id: 'c2', name: 'Dairy & Eggs' },
  { id: 'c3', name: 'Bakery' },
  { id: 'c4', name: 'Fruit' },
  { id: 'c5', name: 'Pantry' },
];

export default {
  props: {
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
    content: { type: Object, required: true },
    wwFrontState: { type: Object, required: true },
    wwElementState: { type: Object, required: true },
  },
  emits: ['trigger-event', 'update:content'],

  setup(props, { emit }) {
    /* ---- State ---- */
    const products = ref([]);
    const categories = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const hasMore = ref(false);
    const currentOffset = ref(0);
    const searchQuery = ref('');
    const selectedCategoryId = ref('');
    const addingProductId = ref(null);

    let searchTimeout = null;

    /* ---- Computed ---- */
    const displayHeading = computed(() => props.content?.heading || 'Fresh from Local Farms');
    const displayEmptyMessage = computed(() => props.content?.emptyMessage || 'No products found. Try changing your search or filters.');
    const displayAddToCartLabel = computed(() => props.content?.addToCartLabel || 'Add to Cart');
    const showSearchComputed = computed(() => props.content?.showSearch !== false);
    const showCategoryFilterComputed = computed(() => props.content?.showCategoryFilter !== false);
    const showPriceComputed = computed(() => props.content?.showPrice !== false);
    const showAddToCartComputed = computed(() => props.content?.showAddToCart !== false);
    const hasToken = computed(() => !!(props.content?.accessToken));
    const accessModeValue = computed(() => props.content?.accessMode || 'members_only');
    const isGated = computed(() => accessModeValue.value === 'members_only' && !hasToken.value);
    const pageSizeValue = computed(() => Math.max(4, Math.min(60, Number(props.content?.pageSize) || 12)));
    const skeletonCount = computed(() => Math.min(pageSizeValue.value, 8));
    const isEditor = computed(() => {
      /* wwEditor:start */
      return !!(typeof wwLib !== 'undefined' && props.wwEditorState);
      /* wwEditor:end */
      return false; // eslint-disable-line no-unreachable
    });

    /* ---- Client factory ---- */
    function makeClient() {
      const url = props.content?.supabaseUrl;
      const key = props.content?.supabaseAnonKey;
      const token = props.content?.accessToken || null;
      if (!url || !key) throw new Error('Supabase URL and Anon Key are required');
      return createSpreadClient({ supabaseUrl: url, supabaseAnonKey: key, accessToken: token });
    }

    /* ---- Fetch products ---- */
    async function fetchProducts(reset = true) {
      if (isGated.value) return;

      /* wwEditor:start */
      if (isEditor.value) {
        products.value = EDITOR_MOCK_PRODUCTS;
        categories.value = EDITOR_MOCK_CATEGORIES;
        hasMore.value = false;
        return;
      }
      /* wwEditor:end */

      if (reset) {
        currentOffset.value = 0;
        products.value = [];
      }

      loading.value = true;
      error.value = null;

      try {
        const client = makeClient();

        const params = {
          p_limit: pageSizeValue.value,
          p_offset: currentOffset.value,
        };
        if (searchQuery.value.trim()) params.p_search = searchQuery.value.trim();
        if (selectedCategoryId.value) params.p_category_id = selectedCategoryId.value;
        if (props.content?.regionId) params.p_region_id = props.content.regionId;

        const data = await client.rpc('get_product_catalog', params);
        // RPC returns { products: [...], total_count: N, has_more: bool }
        const rows = Array.isArray(data?.products) ? data.products : [];
        hasMore.value = !!data?.has_more;

        if (reset) {
          products.value = rows;
        } else {
          products.value = [...products.value, ...rows];
        }
        currentOffset.value += rows.length;

        emit('trigger-event', {
          name: 'catalog:loaded',
          event: { count: products.value.length, hasMore: hasMore.value },
        });
      } catch (err) {
        error.value = err.message || 'Could not load products';
        emit('trigger-event', {
          name: 'catalog:error',
          event: { message: err.message || 'Unknown error' },
        });
      } finally {
        loading.value = false;
      }
    }

    /* ---- Fetch categories ---- */
    async function fetchCategories() {
      /* wwEditor:start */
      if (isEditor.value) {
        categories.value = EDITOR_MOCK_CATEGORIES;
        return;
      }
      /* wwEditor:end */

      try {
        const client = makeClient();
        const data = await client.from('categories', {
          select: 'id,name',
          order: 'name.asc',
        });
        categories.value = Array.isArray(data) ? data : [];
      } catch (_) {
        // Non-critical — category filter just won't populate
        categories.value = [];
      }
    }

    /* ---- Handlers ---- */
    function onSearchInput(e) {
      searchQuery.value = e.target.value;
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetchProducts(true);
      }, 350);
    }

    function clearSearch() {
      searchQuery.value = '';
      if (searchTimeout) clearTimeout(searchTimeout);
      fetchProducts(true);
    }

    function onCategoryChange() {
      fetchProducts(true);
    }

    function loadMore() {
      fetchProducts(false);
    }

    function handleProductClick(product) {
      emit('trigger-event', {
        name: 'product:click',
        event: { productId: product.id, slug: product.slug || '' },
      });
    }

    async function handleAddToCart(product) {
      if (addingProductId.value || isGated.value) return;
      addingProductId.value = product.id;

      try {
        const client = makeClient();
        const result = await client.rpc('add_to_cart', {
          p_product_id: product.id,
          p_variant_id: product.default_variant_id || null,
          p_qty: 1,
        });

        const item = Array.isArray(result) ? result[0] : result;

        emit('trigger-event', {
          name: 'product:addToCart',
          event: {
            productId: product.id,
            variantId: product.default_variant_id || '',
            name: product.name || '',
            price: product.display_price ?? product.member_price ?? product.default_price ?? 0,
            cartItemId: item?.cart_item_id || '',
          },
        });
      } catch (err) {
        emit('trigger-event', {
          name: 'catalog:error',
          event: { message: err.message || 'Could not add to cart' },
        });
      } finally {
        addingProductId.value = null;
      }
    }

    /* ---- Helpers ---- */
    function formatPrice(cents) {
      const n = Number(cents) || 0;
      return (n / 100).toFixed(2);
    }

    function truncate(str, max) {
      if (!str || str.length <= max) return str;
      return str.slice(0, max).trimEnd() + '…';
    }

    /* ---- Lifecycle ---- */
    onMounted(() => {
      fetchProducts(true);
      fetchCategories();
    });

    // Re-fetch when accessToken or accessMode changes (e.g. user logs in)
    watch(
      () => [props.content?.accessToken, props.content?.accessMode],
      () => {
        fetchProducts(true);
      },
    );

    return {
      products,
      categories,
      loading,
      error,
      hasMore,
      searchQuery,
      selectedCategoryId,
      addingProductId,
      displayHeading,
      displayEmptyMessage,
      displayAddToCartLabel,
      showSearchComputed,
      showCategoryFilterComputed,
      showPriceComputed,
      showAddToCartComputed,
      isGated,
      skeletonCount,
      onSearchInput,
      clearSearch,
      onCategoryChange,
      loadMore,
      handleProductClick,
      handleAddToCart,
      fetchProducts,
      formatPrice,
      truncate,
    };
  },
};
</script>

<style scoped>
/* ------------------------------------------------------------------ */
/*  Design tokens (Spread.co design system)                           */
/* ------------------------------------------------------------------ */
.spread-catalog {
  --tyrian: #4B162D;
  --burnt-orange: #CE6632;
  --burnt-orange-hover: #B5572B;
  --black: #141414;
  --dark-grey: #2B2B2B;
  --mid-grey: #4B5563;
  --light-grey: #6B7280;
  --white: #FFFFFF;
  --cream: #FBFAF8;
  --bone-border: #F3EADF;
  --shell-border: #EFE7DE;
  --error-red: #D14343;
  --error-bg: #FEF2F2;
  --error-border: #FECACA;
  --success-green: #16A34A;

  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  box-sizing: border-box;
}

/* ---- Header ---- */
.spread-catalog__header {
  margin-bottom: 20px;
}

.spread-catalog__title {
  font-size: 22px;
  font-weight: 900;
  color: var(--black);
  line-height: 1.25;
  margin: 0;
}

/* ---- Toolbar ---- */
.spread-catalog__toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.spread-catalog__search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.spread-catalog__search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.spread-catalog__search-input {
  width: 100%;
  padding: 10px 36px 10px 38px;
  border: 1px solid var(--bone-border);
  border-radius: 12px;
  font-size: 14px;
  color: var(--dark-grey);
  background: var(--cream);
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
  font-family: inherit;
}

.spread-catalog__search-input:focus {
  border-color: var(--burnt-orange);
}

.spread-catalog__search-input::placeholder {
  color: var(--light-grey);
}

.spread-catalog__search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  color: var(--light-grey);
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
}

.spread-catalog__search-clear:hover {
  color: var(--dark-grey);
}

.spread-catalog__filter-wrap {
  min-width: 160px;
}

.spread-catalog__category-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--bone-border);
  border-radius: 12px;
  font-size: 14px;
  color: var(--dark-grey);
  background: var(--cream);
  outline: none;
  cursor: pointer;
  box-sizing: border-box;
  font-family: inherit;
  appearance: auto;
}

.spread-catalog__category-select:focus {
  border-color: var(--burnt-orange);
}

/* ---- Product grid ---- */
.spread-catalog__grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 16px;
}

@media (min-width: 520px) {
  .spread-catalog__grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 768px) {
  .spread-catalog__grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1024px) {
  .spread-catalog__grid { grid-template-columns: repeat(4, 1fr); }
}

/* ---- Card (inline — matches spread-product-card design) ---- */
.spread-catalog__card {
  background: var(--white);
  border: 1px solid var(--shell-border);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.15s ease;
  display: flex;
  flex-direction: column;
}

.spread-catalog__card:hover {
  box-shadow: 0 4px 16px rgba(75, 22, 45, 0.08);
  transform: translateY(-2px);
}

.spread-catalog__card--oos .spread-catalog__card-name,
.spread-catalog__card--oos .spread-catalog__card-price {
  opacity: 0.5;
}

/* Card image */
.spread-catalog__card-image-wrap {
  position: relative;
  width: 100%;
  padding-top: 75%; /* 4:3 */
  overflow: hidden;
  background: var(--cream);
}

.spread-catalog__card-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.spread-catalog__card-image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream);
}

.spread-catalog__card-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: var(--tyrian);
  color: var(--white);
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2px;
  z-index: 2;
}

.spread-catalog__card-oos {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.spread-catalog__card-oos-label {
  background: var(--dark-grey);
  color: var(--white);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* Card body */
.spread-catalog__card-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.spread-catalog__card-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--black);
  line-height: 1.3;
  margin: 0 0 3px;
}

.spread-catalog__card-desc {
  font-size: 12px;
  color: var(--mid-grey);
  line-height: 1.5;
  margin: 0 0 8px;
}

.spread-catalog__card-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.spread-catalog__card-price {
  font-size: 16px;
  font-weight: 800;
  color: var(--black);
}

.spread-catalog__card-member-hint {
  font-size: 11px;
  color: var(--success-green);
  font-weight: 600;
}

.spread-catalog__card-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 9px 14px;
  background: var(--burnt-orange);
  color: var(--white);
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1px;
  cursor: pointer;
  transition: background 0.15s ease;
  margin-top: auto;
  font-family: inherit;
}

.spread-catalog__card-cta:hover:not(:disabled) {
  background: var(--burnt-orange-hover);
}

.spread-catalog__card-cta:disabled {
  background: #E5E7EB;
  color: #9CA3AF;
  cursor: not-allowed;
  opacity: 0.7;
}

/* ---- Load more ---- */
.spread-catalog__load-more {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* ---- Shared buttons ---- */
.spread-catalog__btn--secondary {
  background: var(--white);
  color: var(--burnt-orange);
  border: 1px solid var(--burnt-orange);
  border-radius: 12px;
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease;
}

.spread-catalog__btn--secondary:hover:not(:disabled) {
  background: var(--cream);
}

.spread-catalog__btn--secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ---- Gate overlay ---- */
.spread-catalog__gate {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.spread-catalog__gate-card {
  text-align: center;
  background: var(--cream);
  border: 1px solid var(--bone-border);
  border-radius: 16px;
  padding: 32px 40px;
  max-width: 400px;
}

.spread-catalog__gate-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--tyrian);
  margin: 12px 0 8px;
}

.spread-catalog__gate-text {
  font-size: 14px;
  color: var(--mid-grey);
  line-height: 1.6;
  margin: 0;
}

/* ---- Error state ---- */
.spread-catalog__error {
  display: flex;
  justify-content: center;
  padding: 32px 0;
}

.spread-catalog__error-card {
  text-align: center;
  background: var(--error-bg);
  border: 1px solid var(--error-border);
  border-radius: 12px;
  padding: 24px 32px;
  max-width: 400px;
}

.spread-catalog__error-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--error-red);
  color: var(--white);
  font-weight: 800;
  font-size: 16px;
  margin-bottom: 12px;
}

.spread-catalog__error-message {
  font-size: 14px;
  color: var(--dark-grey);
  margin: 0 0 16px;
}

/* ---- Empty state ---- */
.spread-catalog__empty {
  text-align: center;
  padding: 48px 0;
}

.spread-catalog__empty-text {
  font-size: 14px;
  color: var(--mid-grey);
}

/* ---- Skeleton loading ---- */
.spread-catalog__skeleton-card {
  background: var(--white);
  border: 1px solid var(--shell-border);
  border-radius: 16px;
  overflow: hidden;
}

.spread-catalog__skeleton-image {
  width: 100%;
  padding-top: 75%;
  background: linear-gradient(90deg, var(--cream) 25%, var(--shell-border) 50%, var(--cream) 75%);
  background-size: 200% 100%;
  animation: spread-catalog-shimmer 1.4s ease-in-out infinite;
}

.spread-catalog__skeleton-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spread-catalog__skeleton-bar {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--cream) 25%, var(--shell-border) 50%, var(--cream) 75%);
  background-size: 200% 100%;
  animation: spread-catalog-shimmer 1.4s ease-in-out infinite;
}

.spread-catalog__skeleton-bar--lg { width: 75%; }
.spread-catalog__skeleton-bar--md { width: 50%; }
.spread-catalog__skeleton-bar--sm { width: 35%; }

@keyframes spread-catalog-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ---- Spinner ---- */
.spread-catalog__spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: var(--white);
  border-radius: 50%;
  animation: spread-catalog-spin 0.6s linear infinite;
}

.spread-catalog__btn--secondary .spread-catalog__spinner {
  border-color: rgba(206, 102, 50, 0.3);
  border-top-color: var(--burnt-orange);
}

@keyframes spread-catalog-spin {
  to { transform: rotate(360deg); }
}
</style>
