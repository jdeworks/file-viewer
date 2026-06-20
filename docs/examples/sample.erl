-module(sample).
-behaviour(gen_server).

-export([start_link/0, stop/0, add/2, lookup/1, all/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-import(lists, [foldl/3, map/2]).

-type key() :: atom() | binary().
-type value() :: term().
-opaque store() :: #{key() => value()}.

-record(state, {
  store :: store(),
  count :: non_neg_integer()
}).

-define(SERVER, ?MODULE).
-define(DEFAULT_TIMEOUT, 5000).

%%% Public API

start_link() ->
  gen_server:start_link({local, ?SERVER}, ?MODULE, [], []).

stop() ->
  gen_server:stop(?SERVER).

add(Key, Value) ->
  gen_server:call(?SERVER, {add, Key, Value}, ?DEFAULT_TIMEOUT).

lookup(Key) ->
  gen_server:call(?SERVER, {lookup, Key}).

all() ->
  gen_server:call(?SERVER, all).

%%% gen_server callbacks

init([]) ->
  {ok, #state{store = #{}, count = 0}}.

handle_call({add, Key, Value}, _From, #state{store = S, count = C} = State) ->
  NewStore = S#{Key => Value},
  {reply, ok, State#state{store = NewStore, count = C + 1}};
handle_call({lookup, Key}, _From, #state{store = S} = State) ->
  Result = maps:get(Key, S, undefined),
  {reply, Result, State};
handle_call(all, _From, #state{store = S} = State) ->
  {reply, maps:to_list(S), State};
handle_call(_Request, _From, State) ->
  {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
  {noreply, State}.

handle_info(_Info, State) ->
  {noreply, State}.

terminate(_Reason, _State) ->
  ok.

code_change(_OldVsn, State, _Extra) ->
  {ok, State}.

%%% Internal helpers

-spec normalize_key(key()) -> binary().
normalize_key(Key) when is_atom(Key) ->
  atom_to_binary(Key, utf8);
normalize_key(Key) when is_binary(Key) ->
  Key.
