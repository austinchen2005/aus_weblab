function showPage(pageName) {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));

  // Remove active class from all nav buttons
  const navButtons = document.querySelectorAll('nav button');
  navButtons.forEach(button => button.classList.remove('active'));

  // Show selected page
  const selectedPage = document.getElementById(`page-${pageName}`);
  if (selectedPage) {
    selectedPage.classList.add('active');
  }

  // Add active class to selected nav button
  const selectedButton = document.getElementById(`nav-${pageName}`);
  if (selectedButton) {
    selectedButton.classList.add('active');
  }

  // Refresh stats display when switching pages
  if (typeof updateStatsDisplay === 'function') {
    updateStatsDisplay();
  }
}

// Make showPage available globally for onclick handlers
window.showPage = showPage;
