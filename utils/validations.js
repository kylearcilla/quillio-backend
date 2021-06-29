const validateRegisterInput = (name, username, password, confirmPassword, email) => {
    const errorsObject = {};  // gather errorsObject as you go. making new properties

    if (name.trim() === '') {
        errorsObject.inputname = "Name must not be empty.";
    }

    if (username.trim() === '') {
        errorsObject.username = "Username must not be empty.";
    }

    if (email.trim() === '') {
        errorsObject.email = "Email must not be empty";
    } else {
        const regEx = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/;

        if (!email.match(regEx)) {
            errorsObject.email = "Email must be a valid email address";
        }
    }

    if (password.trim() === '') {
        errorsObject.password = "Password must not be empty";
    } else if (password !== confirmPassword) {
        errorsObject.confirmPassword = "Confirm password must match with password";
    }

    return {
        errorsObject,
        valid: Object.keys(errorsObject).length < 1
    }

}

const validateLoginInput = (username, password) => {
    const errorsObject = {};

    if (username.trim() === '') {
        errorsObject.username = "Username must not be empty.";
    }

    if (password.trim() === '') {
        errorsObject.password = "Password must not be empty";
    }

    return {
        errorsObject,
        valid: Object.keys(errorsObject).length < 1
    }
}

module.exports = { validateRegisterInput, validateLoginInput };