let isValid = false

const from_name = document.getElementById("from_name");

function showEngagementSuccessToast() {
  const toast = document.getElementById('engagement-success');
    toast.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 9000);
}

function showEngagementErrorToast() {
  const toast = document.getElementById('engagement-error');
    toast.classList.remove('hidden');

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 9000);
}

from_name.addEventListener("blur", (event) => {
  // Validate with the built-in constraints
  from_name.setCustomValidity("");
  if (!from_name.validity.valid) {
    return;
  }

  // Extend with a custom constraints
  if (from_name.value.length == 0) {
    from_name.setCustomValidity("Invalid name value");
  }
});

function validateForm(form) {
    // Using Contraint API
    isValid = form.checkValidity();
    // Style main message for an error
    if(isValid === false) {
        console.log('invalid');
    } else if(isValid === true) {
        console.log('valid');
    }
}

const form = document.getElementById('engagement__form');

const sendEngagementEmail = async (e) => {
    e.preventDefault();

    validateForm(form);

    const formData = new FormData(form);
    try {
            // Use the fetch API with async/await for an asynchronous POST request
            const response = await fetch('https://if2rk6vu3jd4zqqk73q35zqx7y0lvrrv.lambda-url.us-east-1.on.aws/engagement', {
                method: 'POST',
                body: formData, // The browser sets the correct Content-Type header automatically
            });

            // Check if the request was successful
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Parse the response body (assuming the server responds with JSON)
            const result = await response.json();

            console.log('Success:', result);
            showEngagementSuccessToast()
            form.reset(); // Optionally reset the form after success

        } catch (error) {
            showEngagementErrorToast();
            console.error('Error:', error);
        }
    console.log(form);
};


//  Add eventlisteners
form.addEventListener('submit', sendEngagementEmail);

