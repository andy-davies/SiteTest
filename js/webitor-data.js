/**
 * Webitor Data Management
 * Handles data loading, rendering, editing, and change tracking
 */

const WebitorData = (function() {
  let currentData = null;
  let originalData = null;
  let dataFilePath = null;
  let isEditingMode = false;

  /**
   * Initialize: Load data file and render page
   */
  async function init(dataFile) {
    dataFilePath = dataFile;
    console.log('Webitor: Initializing with data file:', dataFile);

    try {
      // Load data from JSON file with cache busting
      const cacheBuster = `?_=${Date.now()}`;
      const response = await fetch(dataFile + cacheBuster, {
        cache: 'no-store', // Disable caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to load data file: ${dataFile}`);
      }

      originalData = await response.json();
      currentData = JSON.parse(JSON.stringify(originalData)); // Deep clone

      console.log('Webitor: Data loaded:', currentData);

      // Render data into page
      renderPage();

      // Set up editing capabilities
      setupEditingMode();

    } catch (error) {
      console.error('Webitor: Error initializing:', error);
    }
  }

  /**
   * Render data into HTML using data-bind attributes
   */
  function renderPage() {
    console.log('Webitor: Rendering page from data');

    // Render simple data bindings
    renderSimpleBindings(currentData.data);

    // Render repeated content (arrays)
    renderRepeatedContent(currentData.data);
  }

  /**
   * Render simple data-bind elements
   */
  function renderSimpleBindings(data, prefix = '') {
    document.querySelectorAll('[data-bind]').forEach(element => {
      const path = element.getAttribute('data-bind');
      const fullPath = prefix ? `${prefix}.${path}` : path;
      const value = getValueByPath(data, path);

      if (value !== undefined) {
        if (element.tagName === 'IMG') {
          // Add cache buster for image URLs (skip for data URLs)
          element.src = value.startsWith('data:') ? value : value + '?_=' + Date.now();
        } else {
          element.textContent = value;
        }

        // Mark as editable
        element.setAttribute('data-editable', 'true');
        element.setAttribute('data-path', fullPath);
      }
    });

    // Handle href bindings
    document.querySelectorAll('[data-bind-href]').forEach(element => {
      const path = element.getAttribute('data-bind-href');
      const value = getValueByPath(data, path);
      if (value !== undefined) {
        element.href = value;
      }
    });

    // Handle src bindings
    document.querySelectorAll('[data-bind-src]').forEach(element => {
      const path = element.getAttribute('data-bind-src');
      const fullPath = prefix ? `${prefix}.${path}` : path;
      const value = getValueByPath(data, path);
      if (value !== undefined) {
        // Add cache buster for image URLs (skip for data URLs)
        element.src = value.startsWith('data:') ? value : value + '?_=' + Date.now();
        // Mark images as editable for the Webitor extension
        element.setAttribute('data-editable-image', 'true');
        element.setAttribute('data-path', fullPath);
      }
    });
  }

  /**
   * Render repeated content from arrays
   */
  function renderRepeatedContent(data) {
    document.querySelectorAll('[data-repeat]').forEach(container => {
      const arrayPath = container.getAttribute('data-repeat');
      const array = getValueByPath(data, arrayPath);

      if (!Array.isArray(array)) {
        console.warn(`Webitor: ${arrayPath} is not an array`);
        return;
      }

      const template = container.querySelector('template[data-template]');
      if (!template) {
        console.warn(`Webitor: No template found for ${arrayPath}`);
        return;
      }

      // Clear existing content (except template)
      Array.from(container.children).forEach(child => {
        if (child !== template) {
          child.remove();
        }
      });

      // Render each item
      array.forEach((item, index) => {
        const clone = template.content.cloneNode(true);

        // Apply data bindings to cloned content
        applyBindingsToClone(clone, item, `${arrayPath}[${index}]`);

        // Insert before template
        container.insertBefore(clone, template);
      });

      console.log(`Webitor: Rendered ${array.length} items for ${arrayPath}`);
    });
  }

  /**
   * Apply data bindings to a cloned template
   */
  function applyBindingsToClone(clone, data, basePath) {
    // Handle data-bind
    clone.querySelectorAll('[data-bind]').forEach(element => {
      const path = element.getAttribute('data-bind');
      const value = getValueByPath(data, path);

      if (value !== undefined) {
        element.textContent = value;
        element.setAttribute('data-editable', 'true');
        element.setAttribute('data-path', `${basePath}.${path}`);
      }
    });

    // Handle data-bind-html (for arrays of paragraphs)
    clone.querySelectorAll('[data-bind-html]').forEach(element => {
      const path = element.getAttribute('data-bind-html');
      const value = getValueByPath(data, path);

      if (Array.isArray(value)) {
        element.innerHTML = value.map(p => `<p data-editable="true" data-path="${basePath}.${path}">${p}</p>`).join('');
      } else if (value !== undefined) {
        element.innerHTML = `<p data-editable="true" data-path="${basePath}.${path}">${value}</p>`;
      }
    });

    // Handle data-bind-src
    clone.querySelectorAll('[data-bind-src]').forEach(element => {
      const path = element.getAttribute('data-bind-src');
      const value = getValueByPath(data, path);
      if (value !== undefined) {
        // Add cache buster for image URLs (skip for data URLs)
        element.src = value.startsWith('data:') ? value : value + '?_=' + Date.now();
        element.setAttribute('data-editable-image', 'true');
        element.setAttribute('data-path', `${basePath}.${path}`);
      }
    });

    // Handle data-id-bind (for tracking items by ID)
    clone.querySelectorAll('[data-id-bind]').forEach(element => {
      const path = element.getAttribute('data-id-bind');
      const value = getValueByPath(data, path);
      if (value !== undefined) {
        element.setAttribute('data-item-id', value);
      }
    });
  }

  /**
   * Get value from object by dot-notation path
   */
  function getValueByPath(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Set value in object by dot-notation path
   */
  function setValueByPath(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      // Handle array indices like "articles[0]" or numeric keys like "0"
      const match = key.match(/^(.+)\[(\d+)\]$/);
      if (match) {
        return current[match[1]][parseInt(match[2])];
      }
      // Handle numeric array indices in dot notation (e.g., "paragraphs.0")
      if (/^\d+$/.test(key)) {
        return current[parseInt(key)];
      }
      return current[key];
    }, obj);

    // Handle the last key - it could also be a numeric array index
    if (/^\d+$/.test(lastKey)) {
      target[parseInt(lastKey)] = value;
    } else {
      target[lastKey] = value;
    }
  }

  /**
   * Setup editing mode
   */
  function setupEditingMode() {
    // Listen for editing mode toggle from Webitor extension
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'TOGGLE_EDITING_MODE') {
          isEditingMode = message.enabled;
          console.log('Webitor: Editing mode:', isEditingMode);

          if (isEditingMode) {
            enableEditing();
          } else {
            disableEditing();
          }

          sendResponse({ success: true });
        } else if (message.type === 'GET_CHANGES') {
          const changes = getChanges();
          sendResponse({ success: true, changes: changes });
        }

        return true;
      });
    }
  }

  /**
   * Enable editing on data-editable elements
   */
  function enableEditing() {
    document.querySelectorAll('[data-editable="true"]').forEach(element => {
      element.contentEditable = 'true';
      element.classList.add('webitor-editable');

      element.addEventListener('blur', handleEdit);
    });
  }

  /**
   * Disable editing
   */
  function disableEditing() {
    document.querySelectorAll('[data-editable="true"]').forEach(element => {
      element.contentEditable = 'false';
      element.classList.remove('webitor-editable');
      element.removeEventListener('blur', handleEdit);
    });
  }

  /**
   * Handle edit event - update data model
   */
  function handleEdit(event) {
    const element = event.target;
    const path = element.getAttribute('data-path');
    const newValue = element.textContent.trim();

    if (path) {
      console.log(`Webitor: Updated ${path} to "${newValue}"`);
      setValueByPath(currentData.data, path, newValue);
    }
  }

  /**
   * Programmatically update a value in the data model
   * This is called by the extension when content is edited
   */
  function updateValue(path, value) {
    if (path) {
      console.log(`Webitor: Programmatically updated ${path} to "${value}"`);
      console.log('Before update, currentData:', JSON.parse(JSON.stringify(currentData.data)));
      setValueByPath(currentData.data, path, value);
      console.log('After update, currentData:', JSON.parse(JSON.stringify(currentData.data)));
      console.log('originalData (for comparison):', JSON.parse(JSON.stringify(originalData.data)));
    }
  }

  /**
   * Get current data object for external access
   */
  function getData() {
    return currentData;
  }

  /**
   * Update an entire array and re-render the affected container
   */
  function updateArray(path, newArray) {
    console.log(`Webitor: Updating array at ${path}`, newArray);

    // Update the data model
    setValueByPath(currentData.data, path, newArray);

    // Re-render the affected repeat container
    const container = document.querySelector(`[data-repeat="${path}"]`);
    if (container) {
      renderSingleRepeatContainer(container, currentData.data);
      console.log(`Webitor: Re-rendered array container for ${path}`);
    } else {
      console.warn(`Webitor: Could not find container for array path: ${path}`);
    }
  }

  /**
   * Add a new item to an array at the beginning and re-render
   */
  function addArrayItem(path, newItem) {
    console.log(`Webitor: Adding new item to array at ${path}`, newItem);

    // Get current array
    const currentArray = getValueByPath(currentData.data, path);
    if (!Array.isArray(currentArray)) {
      throw new Error(`Path ${path} is not an array`);
    }

    // Add new item at the beginning
    currentArray.unshift(newItem);

    // Re-render the affected repeat container
    const container = document.querySelector(`[data-repeat="${path}"]`);
    if (container) {
      renderSingleRepeatContainer(container, currentData.data);
      console.log(`Webitor: Re-rendered array container after adding item to ${path}`);
    } else {
      console.warn(`Webitor: Could not find container for array path: ${path}`);
    }
  }

  /**
   * Render a single repeat container (used for array updates)
   */
  function renderSingleRepeatContainer(container, data) {
    const arrayPath = container.getAttribute('data-repeat');
    const array = getValueByPath(data, arrayPath);

    if (!Array.isArray(array)) {
      console.warn(`Webitor: ${arrayPath} is not an array`);
      return;
    }

    const template = container.querySelector('template[data-template]');
    if (!template) {
      console.warn(`Webitor: No template found for ${arrayPath}`);
      return;
    }

    // Clear existing content (except template and edit button)
    Array.from(container.children).forEach(child => {
      if (child !== template && !child.classList?.contains('webitor-array-edit-button')) {
        child.remove();
      }
    });

    // Render each item
    array.forEach((item, index) => {
      const clone = template.content.cloneNode(true);
      applyBindingsToClone(clone, item, `${arrayPath}[${index}]`);
      container.insertBefore(clone, template);
    });

    // Re-apply editing mode to new elements if editing is active
    if (isEditingMode) {
      container.querySelectorAll('[data-editable="true"]').forEach(element => {
        element.contentEditable = 'true';
        element.classList.add('webitor-editable');
      });
    }
  }

  /**
   * Get changes between original and current data
   */
  function getChanges() {
    const changes = [];

    // Deep compare original and current
    findChanges(originalData.data, currentData.data, '', changes);

    console.log('Webitor: Changes detected:', changes);
    return {
      dataFile: dataFilePath,
      changes: changes,
      updatedData: currentData
    };
  }

  /**
   * Recursively find changes between two objects
   */
  function findChanges(original, current, path, changes) {
    for (const key in current) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof current[key] === 'object' && current[key] !== null) {
        if (Array.isArray(current[key])) {
          // Compare arrays
          if (JSON.stringify(original?.[key]) !== JSON.stringify(current[key])) {
            changes.push({
              path: currentPath,
              oldValue: original?.[key],
              newValue: current[key],
              type: 'array'
            });
          }
        } else {
          // Recurse into objects
          findChanges(original?.[key] || {}, current[key], currentPath, changes);
        }
      } else {
        // Compare primitives
        if (original?.[key] !== current[key]) {
          changes.push({
            path: currentPath,
            oldValue: original?.[key],
            newValue: current[key],
            type: 'value'
          });
        }
      }
    }
  }

  return {
    init: init,
    getChanges: getChanges,
    enableEditing: enableEditing,
    disableEditing: disableEditing,
    updateValue: updateValue,
    getData: getData,
    updateArray: updateArray,
    addArrayItem: addArrayItem
  };
})();
