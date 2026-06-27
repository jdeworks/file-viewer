// 4-bit synchronous counter with reset
// Verilog HDL example

module counter (
    input  wire       clk,
    input  wire       rst_n,
    input  wire       enable,
    output reg  [3:0] count,
    output wire       overflow
);

    parameter WIDTH = 4;
    localparam MAX_COUNT = (1 << WIDTH) - 1;

    assign overflow = (count == MAX_COUNT) && enable;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            count <= 4'b0000;
        end else if (enable) begin
            if (count == MAX_COUNT)
                count <= 4'b0000;
            else
                count <= count + 1'b1;
        end
    end

endmodule

// Simple 2-to-1 multiplexer (gate-level, internal signals)
module mux2to1 (
    input  wire a,
    input  wire b,
    input  wire sel,
    output wire y
);
    wire nsel;
    wire sel_a;
    wire sel_b;

    assign nsel  = ~sel;
    assign sel_a = a & nsel;
    assign sel_b = b & sel;
    assign y     = sel_a | sel_b;
endmodule
