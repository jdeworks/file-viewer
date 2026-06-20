with Ada.Strings.Unbounded;
with Ada.Containers.Vectors;
with Interfaces.C;

-- Sample Ada package specification
-- Demonstrates types, subprogram declarations, and pragmas

package Sample_Collections is

   pragma Pure;
   pragma Elaborate_Body;

   -- Type definitions
   type Element_Id is new Natural;
   type Priority_Level is range 1 .. 10;
   type Status_Type is (Active, Inactive, Pending, Deleted);

   type Point_Record is record
      X : Float;
      Y : Float;
   end record;

   type Matrix is array (Positive range <>, Positive range <>) of Float;

   type String_Access is access Ada.Strings.Unbounded.Unbounded_String;

   -- Generic container interface
   generic
      type Item_Type is private;
      Max_Size : Positive := 100;
   package Generic_Stack is

      type Stack_Type is private;

      procedure Push (Stack : in out Stack_Type; Item : in Item_Type);
      procedure Pop  (Stack : in out Stack_Type; Item : out Item_Type);
      function  Is_Empty (Stack : in Stack_Type) return Boolean;
      function  Size (Stack : in Stack_Type) return Natural;

   private
      type Item_Array is array (1 .. Max_Size) of Item_Type;
      type Stack_Type is record
         Items : Item_Array;
         Top   : Natural := 0;
      end record;
   end Generic_Stack;

   -- Subprogram declarations
   procedure Initialize;
   procedure Finalize;

   function Create_Element
     (Name     : in String;
      Priority : in Priority_Level := 5)
     return Element_Id;

   procedure Update_Status
     (Id     : in Element_Id;
      Status : in Status_Type);

   function Get_Status (Id : in Element_Id) return Status_Type;

   function Distance (A, B : in Point_Record) return Float;

   procedure Sort_Elements
     (Elements : in out Ada.Containers.Vectors.Vector);

   pragma Convention (C, Create_Element);
   pragma Inline (Distance);

end Sample_Collections;
