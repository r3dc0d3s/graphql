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
      user {
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
      try {
        const response = await fetch('https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: profileQuery
          })
        });

        if(!response.ok){
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const result = await response.json();

        //if we encounter a graphql error even if http successful
        if(result.errors){
            console.error("GraphQL errors occurred:", result.errors); // Log all errors for debugging
            throw new Error(result.errors[0].message); //avoid overwhelming the user
        }

        const user = result.data.user[0];
        console.log(user)

        userNameSpan.textContent = user.login;
        userIdSpan.textContent = user.id;
        userEmailSpan.textContent = user.email;

            const xpData = await fetchXPData();
            if (xpData) {
              drawXPGraph(xpData);
            }


      } catch(error) {
        console.error('Failed to fetch profile', error)
      }
}
      
// const mockFetchAndDisplayProfile = async () => {
//   const jwt = localStorage.getItem('jwt');
//   if (!jwt) {
//     showPage('login');
//     return;
//   }

//   try {
//     // In a real app, this is where you'd have your `fetch` call to the GraphQL endpoint.
//     // e.g., const res = await fetch('/graphql', { ... });
//     // const response = await res.json();

//     // To simulate, we create a fake response object with the correct structure.
//     const response = {
//       data: {
//         viewer: mockedProfileData
//       }
//     };

//     const { viewer } = response.data; // Destructure to get the nested 'viewer' object

//     // Populate the spans with the data from our simulated response
//     userNameSpan.textContent = viewer.login;
//     userIdSpan.textContent = viewer.id;
//     userEmailSpan.textContent = viewer.email;

//   } catch (error) {
//     console.error('Failed to fetch profile:', error);
//     // Optional: handle fetch error, e.g., by logging out
//     localStorage.removeItem('jwt');
//     showPage('login');
//   }
// };


// --- Event Listeners ---

// loginForm.addEventListener('submit', async (event) => {
//   event.preventDefault();
//   const identifier = loginForm.identifier.value;
//   const password = loginForm.password.value;

//   try {
//     console.log("Attempting to log in with:", identifier, password);
//     const fakeJwt = "fake-jwt-token-for-testing"; //for testing purposes  now
//     localStorage.setItem('jwt', fakeJwt);
//     console.log('Login successful! JWT:', fakeJwt);
//     loginError.textContent = '';
//     showPage('profile');
//     fetchAndDisplayProfile(); // Call to display profile data after login
//   } catch (error) {
//     console.error('Login failed:', error);
//     loginError.textContent = 'Invalid username or password.';
//   }
// });

loginForm.addEventListener('submit', async (event)=>{
  event.preventDefault();
  const identifier = loginForm.identifier.value;
  const password = loginForm.password.value;
  const encodedCredentials = btoa(`${identifier}:${password}`)
  try {
    const response = await fetch('https://learn.zone01oujda.ma/api/auth/signin',{
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`
      }
    });

    if (!response.ok){
      let errorMessage = `Login failed with status: ${response.status}`;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      }
      throw new Error(errorMessage)
    }

    const jwt = await response.json(); // The JWT is the response body
    localStorage.setItem('jwt', jwt);
    console.log('Login successful! Real JWT received.');
    loginError.textContent = '';
    showPage('profile');
    fetchAndDisplayProfile();
    
    } catch (error) {
      console.error('Login failed:', error);
      loginError.textContent = error.message;
    }
  })

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('jwt');
  showPage('login');
  console.log('Logged out successfully.');
});


// --- Initial Page Load Check ---

const mockCheckLoginStatus = () => {
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

//checkLoginStatus(); // Run on initial page load

// Query: all XP transactions excluding piscine paths
const xpQueryForGraph = `
query GetAccurateXP {
  transaction(
    where: {
      type: { _eq: "xp" }
      _or: [
        { path: { _nlike: "%piscine%" } }
        { object: { type: { _eq: "piscine" } } }
      ]
    }
    order_by: { createdAt: asc }
  ) {
    amount
    createdAt
    object {
      name
    }
  }
}
`;


// Temp test: fetch + sum + log
async function testMyXP() {
  console.log("Testing XP query...");

  const jwt = localStorage.getItem("jwt");
  if (!jwt) {
    console.error("You are not logged in (no jwt in localStorage).");
    return null;
  }

  try {
    const response = await fetch(
      "https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: xpQueryForGraph }),
      }
    );

    if (!response.ok) {
      const msg = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status} ${response.statusText} ${msg}`.trim());
    }

    const result = await response.json();

    if (result.errors?.length) {
      throw new Error(result.errors[0].message);
    }

    const transactions = result.data?.transaction ?? [];
    const totalXP = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    console.log("✅ Calculated Total XP:", totalXP);
    return totalXP;
  } catch (err) {
    console.error("❌ Error during XP test:", err);
    return null;
  }
}

// optional: expose it in DevTools as window.testMyXP()
window.testMyXP = testMyXP;

function drawXPGraph(transactions) {
  if (!transactions || transactions.length === 0) {
    console.log('No XP data to display');
    return;
  }
  
  const svg = document.getElementById('xp-graph');
  const width = 800;
  const height = 400;
  const padding = 60;
  
  // Calculate cumulative XP
  let cumulative = 0;
  const dataPoints = transactions.map(t => {
    cumulative += t.amount;
    return {
      date: new Date(t.createdAt),
      xp: cumulative
    };
  });
  
  // Get min/max for scaling
  const minDate = dataPoints[0].date.getTime();
  const maxDate = dataPoints[dataPoints.length - 1].date.getTime();
  const dateRange = maxDate - minDate;
  const maxXP = dataPoints[dataPoints.length - 1].xp;
  
  // Scale functions
  const xScale = (date) => {
    const time = date.getTime();
    return padding + ((time - minDate) / dateRange) * (width - 2 * padding);
  };
  
  const yScale = (xp) => {
    return height - padding - (xp / maxXP) * (height - 2 * padding);
  };
  
  // Clear SVG
  svg.innerHTML = '';
  
  // Draw axes
  const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  axisLine.setAttribute('x1', padding);
  axisLine.setAttribute('y1', height - padding);
  axisLine.setAttribute('x2', width - padding);
  axisLine.setAttribute('y2', height - padding);
  axisLine.setAttribute('stroke', '#333');
  axisLine.setAttribute('stroke-width', '2');
  svg.appendChild(axisLine);
  
  const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  yAxis.setAttribute('x1', padding);
  yAxis.setAttribute('y1', padding);
  yAxis.setAttribute('x2', padding);
  yAxis.setAttribute('y2', height - padding);
  yAxis.setAttribute('stroke', '#333');
  yAxis.setAttribute('stroke-width', '2');
  svg.appendChild(yAxis);
  
  // Draw line path
  const pathData = dataPoints.map((point, i) => {
    const x = xScale(point.date);
    const y = yScale(point.xp);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('stroke', '#4A90E2');
  path.setAttribute('stroke-width', '3');
  path.setAttribute('fill', 'none');
  svg.appendChild(path);
  
  // Draw points
  dataPoints.forEach(point => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', xScale(point.date));
    circle.setAttribute('cy', yScale(point.xp));
    circle.setAttribute('r', '4');
    circle.setAttribute('fill', '#7B68EE');
    svg.appendChild(circle);
  });
  
  // Add labels
  const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  xLabel.setAttribute('x', width / 2);
  xLabel.setAttribute('y', height - 10);
  xLabel.setAttribute('text-anchor', 'middle');
  xLabel.textContent = 'Time';
  svg.appendChild(xLabel);
  
  const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  yLabel.setAttribute('x', 20);
  yLabel.setAttribute('y', height / 2);
  yLabel.setAttribute('text-anchor', 'middle');
  yLabel.setAttribute('transform', `rotate(-90, 20, ${height / 2})`);
  yLabel.textContent = 'Total XP';
  svg.appendChild(yLabel);
  
  console.log(`✅ Graph drawn with ${dataPoints.length} points, max XP: ${maxXP}`);
}

// Fetch XP transactions for graph
async function fetchXPData() {
  const jwt = localStorage.getItem('jwt');
  if (!jwt) return null;
  
  const query = `
    query {
      transaction(
        where: { type: { _eq: "xp" } }
        order_by: { createdAt: asc }
      ) {
        amount
        createdAt
      }
    }
  `;
  
  try {
    const response = await fetch('https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
    
    return result.data.transaction;
    
  } catch (error) {
    console.error('Failed to fetch XP data:', error);
    return null;
  }
}