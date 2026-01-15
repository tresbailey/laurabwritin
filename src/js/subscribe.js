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


const sendSubscriptionRequest = async (e) => {
    e.preventDefault();

    validateForm(form);

    const formData = new FormData(form);
    try {
            // Use the fetch API with async/await for an asynchronous POST request
            const response = await fetch('https://if2rk6vu3jd4zqqk73q35zqx7y0lvrrv.lambda-url.us-east-1.on.aws/subscription', {
            //const response = await fetch('http://localhost:8000/subscription', {
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


const form = document.getElementById('subscribe__form');
//  Add eventlisteners
form.addEventListener('submit', sendSubscriptionRequest);

