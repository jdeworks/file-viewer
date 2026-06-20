// Simple HLSL shader — Phong lighting model

cbuffer PerFrame : register(b0) {
    float4x4 WorldMatrix;
    float4x4 ViewMatrix;
    float4x4 ProjectionMatrix;
    float3 LightPosition;
    float Padding;
};

cbuffer PerObject : register(b1) {
    float4 DiffuseColor;
    float4 SpecularColor;
    float Shininess;
    float3 ObjectPadding;
};

Texture2D albedoMap : register(t0);
Texture2D normalMap : register(t1);
SamplerState linearSampler : register(s0);

struct VSInput {
    float3 Position : POSITION;
    float3 Normal   : NORMAL;
    float2 TexCoord : TEXCOORD0;
};

struct PSInput {
    float4 Position : SV_Position;
    float3 WorldPos : TEXCOORD0;
    float3 Normal   : TEXCOORD1;
    float2 TexCoord : TEXCOORD2;
};

PSInput VSMain(VSInput input) {
    PSInput output;
    float4 worldPos = mul(float4(input.Position, 1.0f), WorldMatrix);
    output.WorldPos = worldPos.xyz;
    output.Position = mul(mul(worldPos, ViewMatrix), ProjectionMatrix);
    output.Normal = mul(input.Normal, (float3x3)WorldMatrix);
    output.TexCoord = input.TexCoord;
    return output;
}

float4 PSMain(PSInput input) : SV_Target {
    float3 normal = normalize(input.Normal);
    float3 lightDir = normalize(LightPosition - input.WorldPos);
    float diff = max(dot(normal, lightDir), 0.0f);

    float4 albedo = albedoMap.Sample(linearSampler, input.TexCoord);
    float3 diffuse = diff * DiffuseColor.rgb * albedo.rgb;

    return float4(diffuse, 1.0f);
}
