const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginPage = document.getElementById('login-page');
const profilePage = document.getElementById('profile-page');
const logoutButton = document.getElementById('logout-button');

// for populating profile
const userNameSpan = document.getElementById('user-name');
const userIdSpan = document.getElementById('user-id');
const userEmailSpan = document.getElementById('user-email');

// GraphQL Mutations and Queries
const loginMutation = `
  mutation Login($identifier: String!, $password: String!){
    login(identifier: $identifier, password: $password) {
      jwt
    }
  }
`;

const profileQuery = `
  query GetProfile {
    viewer {
      id
      login
      email
    }
  }
`;

// Mocked data for now
const mockedProfileData = {
  id: 'user-3',
  login: 'CTF_Master',
  email: 'ctf.master@example.com',
};

// Helper function to show/hide pages
const showPage = (pageToShow) => {
  if (pageToShow === 'profile') {
    loginPage.style.display = 'none';
    profilePage.style.display = 'block';
  } else if (pageToShow === 'login')  {
    loginPage.style.display = 'block';
    profilePage.style.display = 'none';
  }
};

// --- Profile Data Handling ---
const fetchAndDisplayProfile = async () => {
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    showPage('login');
    return;
  }

  try {
    // In a real app, this is where you'd have your `fetch` call to the GraphQL endpoint.
    // e.g., const res = await fetch('/graphql', { ... });
    // const response = await res.json();

    // To simulate, we create a fake response object with the correct structure.
    const response = {
      data: {
        viewer: mockedProfileData
      }
    };

    const { viewer } = response.data; // Destructure to get the nested 'viewer' object

    // Populate the spans with the data from our simulated response
    userNameSpan.textContent = viewer.login;
    userIdSpan.textContent = viewer.id;
    userEmailSpan.textContent = viewer.email;

  } catch (error) {
    console.error('Failed to fetch profile:', error);
    // Optional: handle fetch error, e.g., by logging out
    localStorage.removeItem('jwt');
    showPage('login');
  }
};


// --- Event Listeners ---

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const identifier = loginForm.identifier.value;
  const password = loginForm.password.value;

  try {
    console.log("Attempting to log in with:", identifier, password);
    const fakeJwt = "fake-jwt-token-for-testing"; //for testing purposes  now
    localStorage.setItem('jwt', fakeJwt);
    console.log('Login successful! JWT:', fakeJwt);
    loginError.textContent = '';
    showPage('profile');
    fetchAndDisplayProfile(); // Call to display profile data after login
  } catch (error) {
    console.error('Login failed:', error);
    loginError.textContent = 'Invalid username or password.';
  }
});

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('jwt');
  showPage('login');
  console.log('Logged out successfully.');
});


// --- Initial Page Load Check ---

const checkLoginStatus = () => {
  const jwt = localStorage.getItem('jwt');
  if (jwt) {
    showPage('profile');
    fetchAndDisplayProfile(); // Call to display profile data on load if logged in
    console.log('User already logged in. Showing profile page.');
  } else {
    showPage('login');
    console.log('No JWT found. Showing login page.');
  }
};

checkLoginStatus(); // Run on initial page load