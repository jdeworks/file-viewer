-- VHDL Sample: 4-bit Up Counter
-- Demonstrates entity, architecture, signals, and processes

library IEEE;
use IEEE.STD_LOGIC_1164.ALL;
use IEEE.STD_LOGIC_UNSIGNED.ALL;
use IEEE.NUMERIC_STD.ALL;

entity counter4bit is
    generic (
        WIDTH : integer := 4
    );
    port (
        clk     : in  STD_LOGIC;
        rst     : in  STD_LOGIC;
        enable  : in  STD_LOGIC;
        count   : out STD_LOGIC_VECTOR(3 downto 0);
        overflow : out STD_LOGIC
    );
end entity counter4bit;

architecture behavioral of counter4bit is
    signal count_reg  : STD_LOGIC_VECTOR(3 downto 0) := (others => '0');
    signal next_count : STD_LOGIC_VECTOR(3 downto 0);
    signal carry      : STD_LOGIC;

begin

    -- Sequential process: register the count
    clk_proc : process(clk, rst)
    begin
        if rst = '1' then
            count_reg <= (others => '0');
        elsif rising_edge(clk) then
            if enable = '1' then
                count_reg <= next_count;
            end if;
        end if;
    end process clk_proc;

    -- Combinational process: compute next state
    comb_proc : process(count_reg)
    begin
        if count_reg = "1111" then
            next_count <= "0000";
            carry <= '1';
        else
            next_count <= STD_LOGIC_VECTOR(UNSIGNED(count_reg) + 1);
            carry <= '0';
        end if;
    end process comb_proc;

    -- Output assignments
    count    <= count_reg;
    overflow <= carry;

end architecture behavioral;


-- A simple adder entity for demonstration
entity adder8bit is
    port (
        a      : in  STD_LOGIC_VECTOR(7 downto 0);
        b      : in  STD_LOGIC_VECTOR(7 downto 0);
        cin    : in  STD_LOGIC;
        sum    : out STD_LOGIC_VECTOR(7 downto 0);
        cout   : out STD_LOGIC
    );
end entity adder8bit;

architecture dataflow of adder8bit is
    signal temp : STD_LOGIC_VECTOR(8 downto 0);
begin
    temp <= ('0' & a) + ('0' & b) + cin;
    sum  <= temp(7 downto 0);
    cout <= temp(8);
end architecture dataflow;
