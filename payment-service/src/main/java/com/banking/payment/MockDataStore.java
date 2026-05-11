package com.banking.payment;

import com.banking.payment.dto.PayeeDto;
import com.banking.payment.dto.PaymentRecord;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;

public final class MockDataStore {

    public static final Map<String, PayeeDto> PAYEES = new LinkedHashMap<>();
    public static final List<PaymentRecord> PAYMENT_RECORDS = new CopyOnWriteArrayList<>();
    public static final Set<String> CUSTOMERS = Set.of(
            "CUST001", "CUST002", "CUST003", "CUST004",
            "CUST005", "CUST006", "CUST007", "CUST008"
    );

    static {
        PAYEES.put("PAY001", new PayeeDto("PAY001", "Irish Utilities Ltd", "IE11AIBK93115200000001", "AIBKIE2D", "AIB Ireland"));
        PAYEES.put("PAY002", new PayeeDto("PAY002", "City Rent Services", "IE22BOFI90001700000002", "BOFIIE2D", "Bank of Ireland"));
        PAYEES.put("PAY003", new PayeeDto("PAY003", "Digital Media Subscriptions", "IE33IRCE92050100000003", "IRCEIE2D", "Permanent TSB"));
        PAYEES.put("PAY004", new PayeeDto("PAY004", "Family Transfer Account", "IE44ULSB98539000000004", "ULSBIE2D", "Ulster Bank"));
        PAYEES.put("PAY005", new PayeeDto("PAY005", "Credit Card Repayments", "IE55IPBS99012300000005", "IPBSIE2D", "PTSB"));
    }

    private MockDataStore() {
    }
}
