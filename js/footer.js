/**
 * Footer Component
 * Loads footer data from external JSON and renders a shared footer
 */
const FooterComponent = (function() {
  let footerData = null;
  let footerContainer = null;
  const DATA_FILE = 'footer.data.json';

  /**
   * Initialize the footer component
   */
  async function init() {
    // Find footer container
    footerContainer = document.getElementById('webitor-footer');
    if (!footerContainer) {
      console.warn('FooterComponent: No #webitor-footer element found');
      return;
    }

    // Load footer data
    try {
      footerData = await loadFooterData();
      render();
    } catch (error) {
      console.error('FooterComponent: Error initializing', error);
    }
  }

  /**
   * Load footer data from JSON file
   */
  async function loadFooterData() {
    const cacheBuster = `?_=${Date.now()}`;
    const response = await fetch(DATA_FILE + cacheBuster, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load footer data: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Render the footer HTML
   */
  function render() {
    if (!footerData || !footerContainer) return;

    const data = footerData.data;

    // Build quick links HTML
    const quickLinksHTML = data.quick_links.links.map(link =>
      `<li><a href="${link.href}">${link.label}</a></li>`
    ).join('');

    // Build policies links HTML
    const policiesHTML = data.policies.links.map(link =>
      `<li><a href="${link.href}">${link.label}</a></li>`
    ).join('');

    // Render full footer structure
    footerContainer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-section">
            <h4>${data.school_info.heading}</h4>
            <p style="white-space: pre-line;">${data.school_info.address}</p>
          </div>
          <div class="footer-section">
            <h4>${data.contact_info.heading}</h4>
            <p style="white-space: pre-line;">${data.contact_info.details}</p>
          </div>
          <div class="footer-section">
            <h4>${data.quick_links.heading}</h4>
            <ul>
              ${quickLinksHTML}
            </ul>
          </div>
          <div class="footer-section">
            <h4>${data.policies.heading}</h4>
            <ul>
              ${policiesHTML}
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>${data.copyright}</p>
        </div>
      </div>
    `;
  }

  /**
   * Get footer data for external access
   */
  function getData() {
    return footerData;
  }

  return {
    init: init,
    getData: getData
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => FooterComponent.init());
} else {
  FooterComponent.init();
}
