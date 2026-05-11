package com.banking.auth;

import java.util.LinkedHashMap;
import java.util.Map;

public final class MockDataStore {

    public static final Map<String, String> USER_PASSWORDS = new LinkedHashMap<>();
    public static final Map<String, String> USER_CUSTOMER_MAP = new LinkedHashMap<>();

    static {
        USER_PASSWORDS.put("alice", "pass123");
        USER_PASSWORDS.put("bob", "pass456");
        USER_PASSWORDS.put("charlie", "pass789");
        USER_PASSWORDS.put("diana", "pass321");
        USER_PASSWORDS.put("edward", "pass654");
        USER_PASSWORDS.put("fiona", "pass987");
        USER_PASSWORDS.put("george", "pass111");
        USER_PASSWORDS.put("helen", "pass222");

        USER_CUSTOMER_MAP.put("alice", "CUST001");
        USER_CUSTOMER_MAP.put("bob", "CUST002");
        USER_CUSTOMER_MAP.put("charlie", "CUST003");
        USER_CUSTOMER_MAP.put("diana", "CUST004");
        USER_CUSTOMER_MAP.put("edward", "CUST005");
        USER_CUSTOMER_MAP.put("fiona", "CUST006");
        USER_CUSTOMER_MAP.put("george", "CUST007");
        USER_CUSTOMER_MAP.put("helen", "CUST008");
    }

    private MockDataStore() {
    }
}
