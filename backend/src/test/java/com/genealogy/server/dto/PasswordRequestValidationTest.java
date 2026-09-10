package com.genealogy.server.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordRequestValidationTest {

    private static jakarta.validation.ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    @Test
    void registerRequestRejectsWeakPassword() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("root2");
        request.setPassword("1234");

        Set<String> messages = validationMessages(request);

        assertThat(messages).contains("password: 密码长度需为8-100位，且须包含大小写字母和数字");
    }

    @Test
    void createUserRequestRejectsWeakPassword() {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("alice");
        request.setPassword("password");

        Set<String> messages = validationMessages(request);

        assertThat(messages).contains("password: 密码长度需为8-100位，且须包含大小写字母和数字");
    }

    @Test
    void resetPasswordRequestRejectsWeakPassword() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setNewPassword("Password");

        Set<String> messages = validationMessages(request);

        assertThat(messages).contains("newPassword: 密码长度需为8-100位，且须包含大小写字母和数字");
    }

    @Test
    void resetPasswordRequestRejectsTooLongPassword() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setNewPassword("Aa1" + "x".repeat(98));

        Set<String> messages = validationMessages(request);

        assertThat(messages).contains("newPassword: 密码长度需为8-100位，且须包含大小写字母和数字");
    }

    @Test
    void passwordRequestsAcceptStrongPassword() {
        RegisterRequest register = new RegisterRequest();
        register.setUsername("root2");
        register.setPassword("Strong123");

        CreateUserRequest create = new CreateUserRequest();
        create.setUsername("alice");
        create.setPassword("Strong123");

        ResetPasswordRequest reset = new ResetPasswordRequest();
        reset.setNewPassword("Strong123");

        assertThat(validator.validate(register)).isEmpty();
        assertThat(validator.validate(create)).isEmpty();
        assertThat(validator.validate(reset)).isEmpty();
    }

    private Set<String> validationMessages(Object request) {
        return validator.validate(request).stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .collect(java.util.stream.Collectors.toSet());
    }
}
