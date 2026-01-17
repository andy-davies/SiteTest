/**
 * Header Component
 * Loads header data from external JSON and renders a shared header with dropdown support
 */
const HeaderComponent = (function() {
  let headerData = null;
  let headerContainer = null;
  const DATA_FILE = 'header.data.json';

  /**
   * Initialize the header component
   */
  async function init() {
    // Find header container
    headerContainer = document.getElementById('webitor-header');
    if (!headerContainer) {
      console.warn('HeaderComponent: No #webitor-header element found');
      return;
    }

    // Load header data
    try {
      headerData = await loadHeaderData();
      render();
      setupDropdownBehavior();
      setActiveNavItem();
    } catch (error) {
      console.error('HeaderComponent: Error initializing', error);
    }
  }

  /**
   * Load header data from JSON file
   */
  async function loadHeaderData() {
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
      throw new Error(`Failed to load header data: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Render the header HTML
   */
  function render() {
    if (!headerData || !headerContainer) return;

    const data = headerData.data;

    // Build navigation items HTML
    const navItemsHTML = data.navigation.map(item => {
      const hasChildren = item.children && item.children.length > 0;
      const dropdownHTML = hasChildren ? buildDropdownHTML(item.children) : '';
      const dropdownClass = hasChildren ? ' has-dropdown' : '';

      return `
        <li class="nav-item${dropdownClass}">
          <a href="${item.href}" data-nav-id="${item.id}">${item.label}</a>
          ${dropdownHTML}
        </li>
      `;
    }).join('');

    // Render full header structure
    headerContainer.innerHTML = `
      <div class="container">
        <div class="header-content">
          <div class="logo">
            <h1 data-bind="header.title" data-editable="true" data-path="title">${data.title}</h1>
            <p class="tagline" data-bind="header.tagline" data-editable="true" data-path="tagline">${data.tagline}</p>
          </div>
          <nav>
            <ul>
              ${navItemsHTML}
            </ul>
          </nav>
        </div>
      </div>
    `;
  }

  /**
   * Build dropdown HTML for nav items with children
   */
  function buildDropdownHTML(children) {
    const childItems = children.map(child =>
      `<li><a href="${child.href}" data-nav-id="${child.id}">${child.label}</a></li>`
    ).join('');

    return `
      <ul class="dropdown-menu">
        ${childItems}
      </ul>
    `;
  }

  /**
   * Setup dropdown hover/focus behavior for accessibility
   */
  function setupDropdownBehavior() {
    const dropdownItems = headerContainer.querySelectorAll('.has-dropdown');

    dropdownItems.forEach(item => {
      const link = item.querySelector('a');
      const dropdown = item.querySelector('.dropdown-menu');

      if (!dropdown) return;

      // Prevent default on parent dropdown link (since href is #)
      link.addEventListener('click', (e) => {
        if (link.getAttribute('href') === '#') {
          e.preventDefault();
        }
      });

      // Mouse events
      item.addEventListener('mouseenter', () => {
        dropdown.classList.add('show');
      });

      item.addEventListener('mouseleave', () => {
        dropdown.classList.remove('show');
      });

      // Keyboard accessibility
      link.addEventListener('focus', () => {
        dropdown.classList.add('show');
      });

      // Close dropdown when focus leaves the entire nav item
      item.addEventListener('focusout', (e) => {
        // Check if focus moved outside this nav item
        setTimeout(() => {
          if (!item.contains(document.activeElement)) {
            dropdown.classList.remove('show');
          }
        }, 10);
      });

      // Allow keyboard navigation within dropdown
      link.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const firstDropdownLink = dropdown.querySelector('a');
          if (firstDropdownLink) firstDropdownLink.focus();
        }
      });

      // Arrow key navigation within dropdown
      const dropdownLinks = dropdown.querySelectorAll('a');
      dropdownLinks.forEach((dropdownLink, index) => {
        dropdownLink.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextLink = dropdownLinks[index + 1];
            if (nextLink) nextLink.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (index === 0) {
              link.focus();
            } else {
              dropdownLinks[index - 1].focus();
            }
          } else if (e.key === 'Escape') {
            dropdown.classList.remove('show');
            link.focus();
          }
        });
      });
    });
  }

  /**
   * Determine and set the active navigation item based on current page
   */
  function setActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Remove any existing active classes
    headerContainer.querySelectorAll('nav a.active').forEach(el => {
      el.classList.remove('active');
    });

    // Find matching nav item in top-level or dropdown and add active class
    const allNavLinks = headerContainer.querySelectorAll('nav a[data-nav-id]');
    allNavLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.classList.add('active');

        // If it's a dropdown item, also highlight the parent dropdown trigger
        const parentDropdown = link.closest('.has-dropdown');
        if (parentDropdown) {
          const parentLink = parentDropdown.querySelector(':scope > a');
          if (parentLink) {
            parentLink.classList.add('active');
          }
        }
      }
    });
  }

  /**
   * Get header data for external access
   */
  function getData() {
    return headerData;
  }

  return {
    init: init,
    getData: getData,
    setActiveNavItem: setActiveNavItem
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => HeaderComponent.init());
} else {
  HeaderComponent.init();
}
