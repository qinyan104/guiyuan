package com.genealogy.server.exception;

/**
 * 请求缺少有效的认证信息：token 缺失/过期，或 token 对应用户已不存在。
 *
 * <p>由 {@code GlobalExceptionHandler} 映射为 HTTP 401，从而触发前端的
 * token 续期/跳转登录流程。此前这类场景抛的是 {@link RuntimeException}，
 * 会被映射成 500「服务器内部错误」，导致前端无法识别为登录失效。
 */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
