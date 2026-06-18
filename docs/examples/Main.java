import java.util.List;

public class Main {
  record Invoice(String id, double amount) {}

  public static double total(List<Invoice> invoices) {
    return invoices.stream().mapToDouble(Invoice::amount).sum();
  }

  public static void main(String[] args) {
    var invoices = List.of(new Invoice("A-100", 42.50), new Invoice("A-101", 18.25));
    System.out.printf("Total: %.2f%n", total(invoices));
  }
}
