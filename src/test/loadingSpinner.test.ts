import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock DOM environment for testing
declare global {
  interface Window {
    __spinnerRemoved?: boolean;
  }
}

// Function to test - copied from main.tsx
const removeLoadingSpinner = () => {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    // Add fade-out class to trigger CSS transition
    spinner.classList.add('fade-out');
    // Remove spinner from DOM after transition completes
    setTimeout(() => {
      if (spinner.parentNode) {
        spinner.parentNode.removeChild(spinner);
      }
    }, 300); // Match the CSS transition duration
  }
};

describe('Loading Spinner Removal', () => {
  beforeEach(() => {
    // Create a mock DOM structure
    document.body.innerHTML = `
      <div id="root">
        <div id="loading-spinner">
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div class="spinner"></div>
            <div class="label">Cargando SMPS…</div>
          </div>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should remove loading spinner when called', () => {
    // Verify spinner exists initially
    const spinner = document.getElementById('loading-spinner');
    expect(spinner).toBeTruthy();
    
    // Call the function
    removeLoadingSpinner();
    
    // Verify spinner gets fade-out class
    expect(spinner?.classList.contains('fade-out')).toBe(true);
    
    // Wait for the timeout to complete
    return new Promise(resolve => {
      setTimeout(() => {
        // Verify spinner is removed from DOM
        const spinnerAfterRemoval = document.getElementById('loading-spinner');
        expect(spinnerAfterRemoval).toBeNull();
        resolve();
      }, 350); // Slightly longer than the 300ms timeout
    });
  });

  it('should handle case where spinner does not exist', () => {
    // Remove spinner first
    document.body.innerHTML = '<div id="root"></div>';
    
    // Call the function - should not throw error
    expect(() => removeLoadingSpinner()).not.toThrow();
  });
});