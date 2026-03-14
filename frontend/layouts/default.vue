<template>
  <div>
    <!-- Site Header -->
    <header class="site-header">
      <NuxtLink to="/" class="site-header__logo">
        Mads <span class="accent">Nørgaard</span>
      </NuxtLink>

      <nav>
        <ul class="site-nav">
          <li><NuxtLink to="/cv">CV</NuxtLink></li>
          <li><NuxtLink to="/writing">Writing</NuxtLink></li>
          <li><NuxtLink to="/projects">Projects</NuxtLink></li>
          <li><NuxtLink to="/with">Stack</NuxtLink></li>
        </ul>
      </nav>
    </header>

    <!-- Page content -->
    <main>
      <slot />
    </main>

    <!-- Site Footer -->
    <footer class="site-footer container">
      <span>Mads Nørgaard, Skanderborg, Denmark</span>
      <span>
        <a href="mailto:mads@madsnorgaard.net">mads@madsnorgaard.net</a>
        ·
        <a href="https://github.com/madsnorgaard" target="_blank" rel="noopener noreferrer">github.com/madsnorgaard</a>
      </span>
    </footer>

    <AppCursor />
  </div>
</template>
