class GREETER

inherit
	ANY

create
	make

feature -- Initialization

	make
		do
			io.put_string ("Hello from GREETER!%N")
		end

feature -- Operations

	greet (name: STRING)
			-- Greet someone by name.
		require
			name /= Void
			not name.is_empty
		do
			io.put_string ("Hello, " + name + "!%N")
		ensure
			-- greeting was output
			True
		end

	add (a, b: INTEGER): INTEGER
			-- Return sum of a and b.
		require
			a >= 0
			b >= 0
		do
			Result := a + b
		ensure
			Result = a + b
		end

end
