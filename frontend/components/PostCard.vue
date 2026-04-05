<template>
  <div
    class="post-card-flip"
    :class="{ 'is-flipped': flipped }"
    @click="flipped = !flipped"
    @keydown.enter="flipped = !flipped"
    @keydown.space.prevent="flipped = !flipped"
    tabindex="0"
    role="button"
    :aria-label="`${post.title}: click to read`"
    :aria-expanded="flipped"
  >
    <!-- Front face -->
    <div class="post-card-flip__face post-card-flip__front">
      <div class="post-card-flip__image">
        <img
          v-if="post.featuredImage?.src"
          :src="post.featuredImage.src"
          :alt="post.featuredImage.alt"
          loading="lazy"
        />
      </div>
      <div class="post-card-flip__body">
        <time class="post-card-flip__date">{{ formatDate(post.date) }}</time>
        <h3 class="post-card-flip__title">{{ post.title }}</h3>
        <span class="post-card-flip__hint">click to read</span>
      </div>
    </div>

    <!-- Back face -->
    <div class="post-card-flip__face post-card-flip__back">
      <div class="post-card-flip__back-body">
        <h3 class="post-card-flip__title">{{ post.title }}</h3>
        <p class="post-card-flip__excerpt">{{ post.excerpt }}</p>
        <div v-if="post.categories?.length || post.tags?.length" class="post-card-flip__terms">
          <span
            v-for="cat in post.categories"
            :key="'c' + cat.id"
            class="post-card-flip__term"
          >{{ cat.name }}</span>
          <span
            v-for="tag in post.tags"
            :key="'t' + tag.id"
            class="post-card-flip__term post-card-flip__term--tag"
          >{{ tag.name }}</span>
        </div>
        <NuxtLink
          :to="`/post/${post.slug}`"
          class="post-card-flip__link"
          @click.stop
        >Read →</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  post: {
    id: number
    title: string
    slug: string
    date: string
    excerpt: string
    featuredImage: { src: string | null; alt: string } | null
    categories: { id: number; name: string; slug: string }[]
    tags: { id: number; name: string; slug: string }[]
  }
}>()

const flipped = ref(false)

function formatDate(dateString: string) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
  })
}
</script>

<style scoped>
.post-card-flip {
  perspective: 1000px;
  cursor: pointer;
  height: 400px;
  position: relative;
}

.post-card-flip__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: transform 500ms cubic-bezier(0.23, 1, 0.32, 1);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  overflow: hidden;
}

.post-card-flip__front {
  transform: rotateY(0deg);
}

.post-card-flip__back {
  transform: rotateY(180deg);
  display: flex;
  flex-direction: column;
}

.post-card-flip.is-flipped .post-card-flip__front {
  transform: rotateY(-180deg);
}

.post-card-flip.is-flipped .post-card-flip__back {
  transform: rotateY(0deg);
}

/* Front */
.post-card-flip__image {
  height: 220px;
  overflow: hidden;
  background: var(--color-border);
}

.post-card-flip__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-card-flip__body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.post-card-flip__date {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.post-card-flip__title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.25;
  color: var(--color-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card-flip__hint {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: #6C6864;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: auto;
}

/* Back */
.post-card-flip__back-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  overflow-y: auto;
}

.post-card-flip__excerpt {
  font-size: 0.85rem;
  color: var(--color-muted);
  line-height: 1.6;
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card-flip__terms {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.post-card-flip__term {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  padding: 0.15em 0.5em;
  background: rgba(196, 30, 58, 0.1);
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.post-card-flip__term--tag {
  background: transparent;
  border: 1px dashed var(--color-border);
  color: var(--color-muted);
}

.post-card-flip__link {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-accent);
  text-decoration: none;
  align-self: flex-start;
}

.post-card-flip__link:hover {
  text-decoration: underline;
}
</style>
