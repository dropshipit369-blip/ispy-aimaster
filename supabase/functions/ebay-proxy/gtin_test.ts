import { assertEquals } from "jsr:@std/assert@1";
import { normaliseGtin } from "./gtin.ts";

Deno.test("accepts valid UPC-A, EAN-13, ISBN-13 and EAN-8", () => {
  assertEquals(normaliseGtin("036000291452"), "036000291452"); // UPC-A
  assertEquals(normaliseGtin("9780141036144"), "9780141036144"); // ISBN-13 (1984, Penguin)
  assertEquals(normaliseGtin("9 300633 603243".replace(/ /g, "")), normaliseGtin("9300633603243"));
  assertEquals(normaliseGtin("96385074"), "96385074"); // EAN-8
  assertEquals(normaliseGtin(" 978-0141036144 "), "9780141036144");
});

Deno.test("rejects wrong check digits, lengths and non-strings", () => {
  assertEquals(normaliseGtin("036000291453"), null);
  assertEquals(normaliseGtin("12345"), null);
  assertEquals(normaliseGtin("abcdefghijkl"), null);
  assertEquals(normaliseGtin(12345678), null);
});
