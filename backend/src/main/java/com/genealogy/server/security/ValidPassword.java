package com.genealogy.server.security;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = PasswordValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidPassword {
    String message() default "密码至少8位，须包含大小写字母和数字";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
