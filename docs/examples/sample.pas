unit Greeter;

{ A small Free Pascal / Delphi unit demonstrating real structure:
  typed routine signatures, record and enum types, a class, and
  const / var sections. (* nested-style *) and // line comments too. }

interface

uses
  SysUtils, Classes, Math;

const
  MaxItems = 100;
  Version: string = '1.0';

type
  // an enumeration
  TColor = (clRed, clGreen, clBlue);

  // a record with typed fields
  TPoint = record
    X, Y: Real;
    Color: TColor;
  end;

  // a class with members and methods
  TPerson = class(TObject)
  private
    FName: string;
  public
    constructor Create(const AName: string);
    procedure Greet(const Name: string);
    function Add(A, B: Integer): Integer;
    property PersonName: string read FName write FName;
  end;

var
  GlobalCount: Integer;
  Origin: TPoint;

// standalone routines exported by the unit
function Distance(const P, Q: TPoint): Real;
procedure ResetCount;

implementation

constructor TPerson.Create(const AName: string);
begin
  inherited Create;
  FName := AName;
end;

procedure TPerson.Greet(const Name: string);
begin
  WriteLn('Hello, ' + Name + '! I am ' + FName + '.');
end;

function TPerson.Add(A, B: Integer): Integer;
begin
  Result := A + B;
end;

function Distance(const P, Q: TPoint): Real;
begin
  Result := Sqrt(Sqr(P.X - Q.X) + Sqr(P.Y - Q.Y));
end;

procedure ResetCount;
begin
  GlobalCount := 0;
end;

end.
