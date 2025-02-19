(() => {
    
    // Check for saved theme preference or use default theme
    const theme = localStorage.getItem('vite-ui-theme') || 'system';
    
    if (theme === 'system') {
        // Check system preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        document.documentElement.classList.add(systemTheme);
    } else {
        document.documentElement.classList.add(theme);
    }
    
    // Optional: Set a data attribute on the html element (useful for CSS targeting)
    document.documentElement.setAttribute('data-theme', theme);
})();